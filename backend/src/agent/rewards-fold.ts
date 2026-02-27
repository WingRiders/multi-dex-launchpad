import type {Value} from '@cardano-ogmios/schema'
import {resolveStakeKeyHash} from '@meshsdk/core'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  buildTx,
  calculateTxValidityIntervalAfterLaunchEnd,
  createUnit,
  decodeDatum,
  dexToMeshData,
  ensure,
  type GeneratedContracts,
  getRewardsFoldDatumCborSchema,
  getUtxoAda,
  type LaunchConfig,
  LOVELACE_UNIT,
  makeBuilder,
  networkToNetworkId,
  nodeRedeemerToMeshData,
  parseUnit,
  type RewardsFoldDatum,
  rewardsFoldDatumToMeshData,
  rewardsFoldRedeemerToMeshData,
  rewardsHolderDatumToMeshData,
  SPLIT_BPS_BASE,
  sortUtxos,
  tokensHolderFirstRedeemerToMeshData,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import {maxBy} from 'es-toolkit'
import {max} from 'es-toolkit/compat'
import type {
  FirstProjectTokensHolder,
  Launch,
  Node,
  RewardsFold,
  TxOutput,
} from '../../prisma/generated/client'
import {config} from '../config'
import {
  deserializeValue,
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../db/helpers'
import {txOutputToRefScriptUtxo} from '../endpoints/ref-scripts'
import {logger} from '../logger'
import {CONSTANT_CONTRACTS} from './constants'
import {getMeshBuilderBodyForLogging} from './helpers'
import {submitTx} from './ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from './providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  trackSpentInputs,
} from './wallet'

const presaleAssetOf = (presaleTierPolicyId: string, nodeValue: Value) => {
  const presaleValue = nodeValue[presaleTierPolicyId]
  if (!presaleValue) return null
  const entries = Object.entries(presaleValue)
  ensure(entries.length === 1, {entries}, 'Should never happen')
  const [presaleAssetName, presaleCount] = entries[0]!
  ensure(presaleCount === 1n, {presaleCount}, 'Should never happen')
  return {
    unit: createUnit(presaleTierPolicyId, presaleAssetName),
    quantity: presaleCount.toString(),
  }
}

type Reward = {
  projectTokens: bigint
  returnedCommittedTokens: bigint
  takenCommittedTokens: bigint
}

const rewardsFor = (
  cutoffTime: number | null,
  cutoffKey: {hash: string; index: number} | null,
  overcommitted: bigint,
  tokensToDistribute: bigint,
  totalCommitted: bigint,
  node: Node,
): Reward => {
  const rewards = (committed: bigint) =>
    (tokensToDistribute * committed) / totalCommitted

  const isKeyLess = (
    key1: {hash: string; index: number},
    key2: {hash: string; index: number},
  ) => {
    if (key1.hash < key2.hash) return true
    if (key1.hash > key2.hash) return false
    return key1.index < key2.index
  }

  ensure(
    node.keyHash != null,
    {node},
    'Node must have key hash, head node not allowed',
  )
  ensure(
    node.keyIndex != null,
    {node},
    'Node must have key index, head node not allowed',
  )
  const nodeKey = {hash: node.keyHash, index: node.keyIndex}

  const normalRewards = {
    projectTokens: rewards(node.committed),
    returnedCommittedTokens: 0n,
    takenCommittedTokens: node.committed,
  }

  const refundRewards = {
    projectTokens: 0n,
    returnedCommittedTokens: node.committed,
    takenCommittedTokens: 0n,
  }

  const cutoffRewards = {
    projectTokens: rewards(node.committed - overcommitted),
    returnedCommittedTokens: overcommitted,
    takenCommittedTokens: node.committed - overcommitted,
  }

  // no cutoff => full rewards
  if (!cutoffTime || !cutoffKey) return normalRewards
  // node before cutoff => full rewards
  if (cutoffTime > node.createdTime) return normalRewards
  // node after cutoff => full refund
  if (cutoffTime < node.createdTime) return refundRewards
  // node on cutoff time, before cutoff key => full rewards
  if (isKeyLess(nodeKey, cutoffKey)) return normalRewards
  // node on cutoff time, after cutoff key => full refund
  if (isKeyLess(cutoffKey, nodeKey)) return refundRewards
  // node on cutoff => partial refund
  return cutoffRewards
}

const getCompensations = (
  indexedNodes: {
    index: number
    node: Node
    txOut: TxOutput
    stakeKeyHash: string | undefined
  }[],
  rewardsFoldDatum: RewardsFoldDatum,
  launchConfig: LaunchConfig,
): {
  reward: Reward
  node: Node
  txOut: TxOutput
  stakeKeyHash: string | undefined
}[] => {
  const compensations: {
    reward: Reward
    node: Node
    txOut: TxOutput
    stakeKeyHash: string | undefined
  }[] = []

  for (const {node, txOut, stakeKeyHash} of indexedNodes) {
    if (node.committed === 0n) continue

    const reward = rewardsFor(
      rewardsFoldDatum.cutoffTime,
      rewardsFoldDatum.cutoffKey,
      rewardsFoldDatum.overcommitted,
      launchConfig.tokensToDistribute,
      rewardsFoldDatum.committed,
      node,
    )

    compensations.push({reward, node, txOut, stakeKeyHash})
  }

  return compensations
}

// Divides two bigints and rounds up
// Only works for non-negative `a` and positive `b`
const divideCeil = (a: bigint, b: bigint) => {
  ensure(a >= 0n, {a}, 'a must be non-negative')
  ensure(b > 0n, {b}, 'b must be positive')
  const quotient = a / b
  const remainder = a % b
  return quotient + (remainder > 0n ? 1n : 0n)
}

export const buildSubmitRewardsFolding = async (
  launch: Launch,
  contracts: GeneratedContracts,
  rewardsFoldValidatorRefScriptCarrier: TxOutput,
  rewardsFoldPolicyRefScriptCarrier: TxOutput,
  nodeValidatorRefScriptCarrier: TxOutput,
  nodePolicyRefScriptCarrier: TxOutput,
  firstProjectTokensHolderValidatorRefScriptCarrier: TxOutput,
  projectTokensHolderPolicyRefScriptCarrier: TxOutput,
  finalProjectTokensHolderValidatorRefScriptCarrier: TxOutput,
  rewardsFold: RewardsFold & {txOut: TxOutput},
  nodes: (Node & {txOut: TxOutput})[],
  firstProjectTokensHolder: FirstProjectTokensHolder & {txOut: TxOutput},
) => {
  const launchConfig = prismaLaunchToLaunchConfig(launch)
  const usesWr = launchConfig.splitBps > 0
  const usesSundae = launchConfig.splitBps < SPLIT_BPS_BASE
  const [projectSymbol, projectToken] = parseUnit(launchConfig.projectToken)
  const [raisingSymbol, raisingToken] = parseUnit(launchConfig.raisingToken)
  const isAdaLaunch = launchConfig.raisingToken === LOVELACE_UNIT

  const makeAssetsWithOverlap = (lovelace: bigint, committed: bigint) =>
    isAdaLaunch
      ? [{unit: LOVELACE_UNIT, quantity: (lovelace + committed).toString()}]
      : [
          {unit: LOVELACE_UNIT, quantity: lovelace.toString()},
          {unit: launchConfig.raisingToken, quantity: committed.toString()},
        ]

  const rewardsFoldValidatorRef = txOutputToRefScriptUtxo(
    rewardsFoldValidatorRefScriptCarrier,
  )
  const rewardsFoldPolicyRef = txOutputToRefScriptUtxo(
    rewardsFoldPolicyRefScriptCarrier,
  )
  const nodeValidatorRef = txOutputToRefScriptUtxo(
    nodeValidatorRefScriptCarrier,
  )
  const nodePolicyRef = txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier)
  const firstProjectTokensHolderValidatorRef = txOutputToRefScriptUtxo(
    firstProjectTokensHolderValidatorRefScriptCarrier,
  )
  const projectTokensHolderPolicyRef = txOutputToRefScriptUtxo(
    projectTokensHolderPolicyRefScriptCarrier,
  )
  const finalProjectTokensHolderValidatorRef = txOutputToRefScriptUtxo(
    finalProjectTokensHolderValidatorRefScriptCarrier,
  )

  const firstProjectTokensHolderTxOut = prismaTxOutputToMeshOutput(
    firstProjectTokensHolder.txOut,
  )
  const rewardsFoldTxOut = prismaTxOutputToMeshOutput(rewardsFold.txOut)

  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )

  const walletUtxos = getSpendableWalletUtxos()
  setFetcherUtxos([
    ...walletUtxos,
    rewardsFoldValidatorRef,
    rewardsFoldPolicyRef,
    rewardsFoldTxOut,
    nodeValidatorRef,
    nodePolicyRef,
    ...nodes.map((n) => prismaTxOutputToMeshOutput(n.txOut)),
    firstProjectTokensHolderTxOut,
    firstProjectTokensHolderValidatorRef,
    finalProjectTokensHolderValidatorRef,
    projectTokensHolderPolicyRef,
  ])
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')
  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )
  b.selectUtxosFrom(walletUtxos)

  const {validityStartSlot, validityEndSlot} =
    calculateTxValidityIntervalAfterLaunchEnd(
      config.NETWORK,
      launchConfig.endTime,
    )
  b.invalidBefore(validityStartSlot)
  b.invalidHereafter(validityEndSlot)

  // TODO: the way we select utxos here is far from optimal
  //       ideally mesh would just allow us to fix up redeemers
  //
  //       instead, we should at least calculate how much ada we need to provide
  //       and select wallet utxos based on that
  //       ^ this complicates the code a lot, it's long enough without this selection
  //
  //       right now we select a wallet utxo with the highest ada;
  //       mesh might still add inputs if that's not enough
  const walletUtxo = maxBy(walletUtxos, getUtxoAda)
  ensure(walletUtxo != null, {walletUtxos}, 'No wallet utxo with ada found')
  b.txIn(
    walletUtxo.input.txHash,
    walletUtxo.input.outputIndex,
    walletUtxo.output.amount,
    walletUtxo.output.address,
    0,
  )

  // Redeemers depend on the order of inputs
  const sortedInputs = sortUtxos([
    ...nodes.map((n) => prismaTxOutputToMeshOutput(n.txOut)),
    prismaTxOutputToMeshOutput(rewardsFold.txOut),
    prismaTxOutputToMeshOutput(firstProjectTokensHolder.txOut),
    walletUtxo,
  ])

  // Indices into tx inputs + nodes
  const indexedNodes = nodes.map((node) => {
    const index = sortedInputs.findIndex(
      (sortedInput) =>
        sortedInput.input.txHash === node.txHash &&
        sortedInput.input.outputIndex === node.outputIndex,
    )
    const txOut = nodes.find(
      (n) => n.txHash === node.txHash && n.outputIndex === node.outputIndex,
    )?.txOut
    ensure(txOut != null, {node, nodes}, 'Node not found in nodes')
    const stakeKeyHash = Result.try(() =>
      resolveStakeKeyHash(txOut.address),
    ).unwrapOr(undefined)
    return {index, txOut, node, stakeKeyHash}
  })

  ensure(
    rewardsFold.txOut.datum != null,
    {rewardsFold},
    'Rewards fold must have datum',
  )
  const rewardsFoldDatum = decodeDatum(
    getRewardsFoldDatumCborSchema(config.NETWORK),
    rewardsFold.txOut.datum,
  )
  ensure(
    rewardsFoldDatum != null,
    {rewardsFold},
    'Rewards fold must have datum',
  )

  const compensations = getCompensations(
    indexedNodes,
    rewardsFoldDatum,
    launchConfig,
  )

  // In redeemers we mostly pass in indices for various input/output utxos
  const inputRewardsFoldIndex = sortedInputs.findIndex(
    (utxo) => utxo.output.address === rewardsFold.txOut.address,
  )
  const foldIndex = inputRewardsFoldIndex
  const inputNodes = indexedNodes.map((n) => n.index)
  // for each input node: output compensation index if exists, -1 otherwise
  // compensations are paid out first, so we can start counting from 0
  const outputNodes = indexedNodes.map(({node}) =>
    node.committed === 0n
      ? -1
      : compensations.findIndex((c) => c.node === node),
  )
  ensure(
    inputNodes.length === outputNodes.length,
    {inputNodes, outputNodes},
    'Should never fail',
  )
  const inputTokensHolderIndex = sortedInputs.findIndex(
    (utxo) => utxo.output.address === firstProjectTokensHolder.txOut.address,
  )
  // paid during the last iteration only,
  // ignored otherwise
  // comes after the compensations if exists
  const lastCompensationIndex = max(outputNodes)
  ensure(
    lastCompensationIndex != null,
    {outputNodes},
    'Should never fail, at least one node required',
  )
  const commitFoldCompensationIndex = lastCompensationIndex + 1
  // paid during the last iteration only
  // ignored otherwise
  // comes after the commit fold compensation if exists
  const daoCompensationIndex = commitFoldCompensationIndex + 1
  // paid during the last iteration only
  // ignored otherwise
  // comes after the dao compensation if exists
  const ownerCompensationIndex = daoCompensationIndex + 1

  // Spend all the nodes
  for (const {txOut: nodeTxOut} of nodes) {
    const node = prismaTxOutputToMeshOutput(nodeTxOut)
    b.spendingPlutusScriptV2()
      .txIn(
        node.input.txHash,
        node.input.outputIndex,
        node.output.amount,
        node.output.address,
        0,
      )
      .spendingTxInReference(
        nodeValidatorRef.input.txHash,
        nodeValidatorRef.input.outputIndex,
        nodeValidatorRef.scriptSize.toString(),
        nodeValidatorRef.output.scriptHash,
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue(
        nodeRedeemerToMeshData({type: 'delegate-to-rewards-fold', foldIndex}),
      )
  }

  // Burn the node tokens
  b.mintPlutusScriptV2()
    .mint(
      (-nodes.length).toString(),
      contracts.nodePolicy.hash,
      contracts.nodeValidator.hash,
    )
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // Spend the rewards holder
  b.spendingPlutusScriptV2()
    .txIn(
      rewardsFoldTxOut.input.txHash,
      rewardsFoldTxOut.input.outputIndex,
      rewardsFoldTxOut.output.amount,
      rewardsFoldTxOut.output.address,
      0,
    )
    .spendingTxInReference(
      rewardsFoldValidatorRef.input.txHash,
      rewardsFoldValidatorRef.input.outputIndex,
      rewardsFoldValidatorRef.scriptSize.toString(),
      rewardsFoldValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      rewardsFoldRedeemerToMeshData({
        type: 'rewards-fold',
        inputNodes,
        outputNodes,
        commitFoldCompensationIndex,
        inputRewardsFoldIndex,
        inputTokensHolderIndex,
        daoCompensationIndex,
        ownerCompensationIndex,
      }),
    )

  // last fold happens when the last node is spent
  // i.e. a node with its next field set to nothing
  const isLastFold = nodes.some((n) => n.nextIndex == null)

  // Burn the rewards holder token in the last fold
  if (isLastFold)
    b.mintPlutusScriptV2()
      .mint(
        '-1',
        contracts.rewardsFoldPolicy.hash,
        contracts.rewardsFoldValidator.hash,
      )
      .mintTxInReference(
        rewardsFoldPolicyRef.input.txHash,
        rewardsFoldPolicyRef.input.outputIndex,
        rewardsFoldPolicyRef.scriptSize.toString(),
        rewardsFoldPolicyRef.output.scriptHash,
      )
      .mintRedeemerValue([])

  // Spend the first token holder
  b.spendingPlutusScriptV2()
    .txIn(
      firstProjectTokensHolderTxOut.input.txHash,
      firstProjectTokensHolderTxOut.input.outputIndex,
      firstProjectTokensHolderTxOut.output.amount,
      firstProjectTokensHolderTxOut.output.address,
      0,
    )
    .spendingTxInReference(
      firstProjectTokensHolderValidatorRef.input.txHash,
      firstProjectTokensHolderValidatorRef.input.outputIndex,
      firstProjectTokensHolderValidatorRef.scriptSize.toString(),
      firstProjectTokensHolderValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      tokensHolderFirstRedeemerToMeshData('delegate-to-rewards-or-failure'),
    )

  // Burn the tokens holder in the last fold
  if (isLastFold)
    b.mintPlutusScriptV2()
      .mint(
        '-1',
        contracts.tokensHolderPolicy.hash,
        contracts.tokensHolderFirstValidator.hash,
      )
      .mintTxInReference(
        projectTokensHolderPolicyRef.input.txHash,
        projectTokensHolderPolicyRef.input.outputIndex,
        projectTokensHolderPolicyRef.scriptSize.toString(),
        projectTokensHolderPolicyRef.output.scriptHash,
      )
      .mintRedeemerValue([])

  // Add compensation outputs
  for (const {reward, node, txOut, stakeKeyHash} of compensations) {
    ensure(
      node.keyHash != null,
      {node},
      'Node must have key hash, head node not allowed',
    )
    ensure(
      node.keyIndex != null,
      {node},
      'Node must have key index, head node not allowed',
    )
    const owner = {hash: node.keyHash, index: node.keyIndex}
    const amount = [
      ...makeAssetsWithOverlap(
        launchConfig.oilAda,
        // Would Mesh work with 0 here?
        reward.returnedCommittedTokens,
      ),
      {
        unit: launchConfig.projectToken,
        quantity: reward.projectTokens.toString(),
      },
    ]

    const presaleAsset = presaleAssetOf(
      launchConfig.presaleTierCs,
      deserializeValue(txOut.value),
    )
    if (presaleAsset) amount.push(presaleAsset)

    const rewardsHolderAddress = scriptHashToBech32(
      CONSTANT_CONTRACTS.rewardsHolderValidator.hash,
      stakeKeyHash,
      networkToNetworkId[config.NETWORK],
    )

    b.txOut(rewardsHolderAddress, amount).txOutInlineDatumValue(
      rewardsHolderDatumToMeshData({
        owner,
        projectSymbol,
        projectToken,
        raisingSymbol,
        raisingToken,
        usesWr,
        usesSundae,
        endTime: launchConfig.endTime,
      }),
    )
  }

  const inputHolderValue = deserializeValue(
    firstProjectTokensHolder.txOut.value,
  )
  const inputHolderLovelace = inputHolderValue.ada.lovelace
  const inputHolderCommittedTokens =
    // when raising ada, both symbol and token would be '' instead of 'ada' and 'lovelace'
    inputHolderValue[raisingSymbol || 'ada']?.[raisingToken || 'lovelace']
  ensure(
    inputHolderCommittedTokens != null,
    {firstProjectTokensHolder},
    'First tokens holder must have committed tokens',
  )
  const inputHolderProjectTokens =
    inputHolderValue[projectSymbol]?.[projectToken]
  ensure(
    inputHolderProjectTokens != null,
    {firstProjectTokensHolder},
    'First tokens holder must have project tokens',
  )

  // We need to keep track of the expected change in the project holder(s)
  // we include the input holder value
  // and also the expected change from the collected and distributed tokens
  const committedThisTx = compensations.reduce(
    (acc, c) => acc + c.reward.takenCommittedTokens,
    0n,
  )
  const distributedThisTx = compensations.reduce(
    (acc, c) => acc + c.reward.projectTokens,
    0n,
  )

  const foldInputLovelace = deserializeValue(rewardsFold.txOut.value).ada
    .lovelace
  // Goes to
  // - either the rewards fold unless last fold
  // - or the commit fold compensation if last fold
  const foldOutLovelace =
    // all lovelace from the fold
    foldInputLovelace +
    // and commit fold fee per each node
    launchConfig.commitFoldFeeAda * BigInt(nodes.length)

  if (!isLastFold) {
    // Recreate the rewards fold when not last iteration
    const lastNode = nodes.at(-1)
    ensure(lastNode != null, {nodes}, 'Should never happen')
    // This is ensured by !isLastFold
    ensure(lastNode.nextHash != null, {lastNode}, 'Should never happen')
    ensure(lastNode.nextIndex != null, {lastNode}, 'Should never happen')

    const next = {hash: lastNode.nextHash, index: lastNode.nextIndex}

    b.txOut(rewardsFold.txOut.address, [
      {
        unit: LOVELACE_UNIT,
        quantity: foldOutLovelace.toString(),
      },
      {
        unit: createUnit(
          contracts.rewardsFoldPolicy.hash,
          contracts.rewardsFoldValidator.hash,
        ),
        quantity: '1',
      },
    ]).txOutInlineDatumValue(
      rewardsFoldDatumToMeshData({...rewardsFoldDatum, next}),
    )

    // Recreate the first tokens holder when not last iteration
    const outputHolderCommitted = inputHolderCommittedTokens + committedThisTx
    const outputHolderProject = inputHolderProjectTokens - distributedThisTx
    const outputHolderLovelace = inputHolderLovelace
    const outputHolderAssets = [
      // NOTE: we need to send exactly outputHolderCommitted for ada launches, not the sum
      ...(isAdaLaunch
        ? [{unit: LOVELACE_UNIT, quantity: outputHolderCommitted.toString()}]
        : [
            {unit: LOVELACE_UNIT, quantity: outputHolderLovelace.toString()},
            {
              unit: launchConfig.raisingToken,
              quantity: outputHolderCommitted.toString(),
            },
          ]),
      {
        unit: launchConfig.projectToken,
        quantity: outputHolderProject.toString(),
      },
      {
        unit: createUnit(
          contracts.tokensHolderPolicy.hash,
          contracts.tokensHolderFirstValidator.hash,
        ),
        quantity: '1',
      },
    ]
    ensure(
      firstProjectTokensHolder.txOut.datum != null,
      {firstProjectTokensHolder},
      'First tokens holder must have datum',
    )
    b.txOut(
      firstProjectTokensHolder.txOut.address,
      outputHolderAssets,
    ).txOutInlineDatumValue(firstProjectTokensHolder.txOut.datum, 'CBOR')
  }

  if (isLastFold) {
    // In case committed tokens are ada, collateral must be substracted before doing any math
    const collateralCommittedOut = isAdaLaunch ? launchConfig.collateral : 0n
    // Total committed out is the sum of all committed tokens in the launch minus collateral if ada
    const totalCommittedOut =
      inputHolderCommittedTokens + committedThisTx - collateralCommittedOut
    // Dao receives a specified percentage of all collected committed tokens
    const daoCommittedOut =
      (launchConfig.daoFeeNumerator * totalCommittedOut) /
      launchConfig.daoFeeDenominator
    // The rest is split between the holders and the launch owner
    const restCommittedOut = totalCommittedOut - daoCommittedOut
    // Token holders receive a specified percentage after deducting the dao fee
    const tokensHoldersCommittedOut =
      (restCommittedOut * BigInt(launchConfig.raisedTokensPoolPartPercentage)) /
      100n
    // Launch owner receives whatever is left after the holders and the dao fee
    const launchOwnerCommittedOut = restCommittedOut - tokensHoldersCommittedOut
    // Wr pool receives its share of what all output token holders receive
    const wrHolderCommittedOut = divideCeil(
      tokensHoldersCommittedOut * BigInt(launchConfig.splitBps),
      BigInt(SPLIT_BPS_BASE),
    )
    // Sundae pool receives the rest
    const sundaeHolderCommittedOut =
      tokensHoldersCommittedOut - wrHolderCommittedOut

    // These project tokens are left after distributing all user rewards
    const totalProjectOut = inputHolderProjectTokens - distributedThisTx
    // Wr pool receives its share
    const wrHolderProjectOut = divideCeil(
      totalProjectOut * BigInt(launchConfig.splitBps),
      BigInt(SPLIT_BPS_BASE),
    )
    // Sundae pool receives the rest
    const sundaeHolderProjectOut = totalProjectOut - wrHolderProjectOut

    // Dao receives at least oil ada
    const daoOutLovelace = launchConfig.oilAda
    // Holders might receive (1/2)*oil depending on how many are created
    let holdersOutLovelace = launchConfig.oilAda
    const twoDexes =
      launchConfig.splitBps > 0n && launchConfig.splitBps < 10_000n
    if (twoDexes) holdersOutLovelace *= 2n

    // Compensate the commit fold owner
    const assetsCommitFoldCompensation = [
      {unit: LOVELACE_UNIT, quantity: foldOutLovelace.toString()},
    ]
    b.txOut(rewardsFoldDatum.commitFoldOwner, assetsCommitFoldCompensation)

    // Pay to the dao when last iteration
    const assetsDao = makeAssetsWithOverlap(daoOutLovelace, daoCommittedOut)
    b.txOut(launchConfig.daoFeeReceiverBech32Address, assetsDao)

    // Pay to the launch owner when last iteration
    const ownerOutLovelace =
      launchConfig.collateral - daoOutLovelace - holdersOutLovelace
    const assetsOwner = makeAssetsWithOverlap(
      ownerOutLovelace,
      launchOwnerCommittedOut,
    )
    b.txOut(launchConfig.ownerBech32Address, assetsOwner)

    // Pay to the final tokens holder(s) when last iteration
    const finalHolderAddress = scriptHashToBech32(
      contracts.tokensHolderFinalValidator.hash,
      undefined,
      networkToNetworkId[config.NETWORK],
    )

    const outLovelacePerDex = twoDexes
      ? holdersOutLovelace / 2n
      : holdersOutLovelace
    const assetsWr = [
      ...makeAssetsWithOverlap(outLovelacePerDex, wrHolderCommittedOut),
      {
        unit: launchConfig.projectToken,
        quantity: wrHolderProjectOut.toString(),
      },
    ]
    const assetsSundae = [
      ...makeAssetsWithOverlap(outLovelacePerDex, sundaeHolderCommittedOut),
      {
        unit: launchConfig.projectToken,
        quantity: sundaeHolderProjectOut.toString(),
      },
    ]

    if (usesWr)
      b.txOut(finalHolderAddress, assetsWr).txOutInlineDatumValue(
        dexToMeshData('WingRidersV2'),
      )

    if (usesSundae)
      b.txOut(finalHolderAddress, assetsSundae).txOutInlineDatumValue(
        dexToMeshData('SundaeSwapV3'),
      )
  }

  const logContext = {
    isLastFold,
    launchTxHash: launch.txHash,
    compensations: compensations.length,
    nodes: nodes.length,
  }

  const unsignedTx = await buildTx(b)
  if (unsignedTx.isErr()) {
    logger.error(
      {
        ...logContext,
        error: unsignedTx.error,
        txBuilderBody: getMeshBuilderBodyForLogging(b),
      },
      `Error when building rewards fold transaction: ${unsignedTx.error.message}`,
    )
    return null
  }

  trackSpentInputs(b)

  const signedTx = await wallet.signTx(unsignedTx.value)

  logger.info(
    {...logContext, signedTx},
    'Submitting rewards fold transaction...',
  )
  const txHash = await Result.tryPromise(() => submitTx(signedTx))
  if (txHash.isErr()) {
    logger.error(
      {
        ...logContext,
        txBuilderBody: getMeshBuilderBodyForLogging(b),
        signedTx,
        error: txHash.error,
        cause: txHash.error.cause, // txHash.error.cause.data is omitted above
      },
      `Error when submitting rewards fold transaction: ${txHash.error.message}`,
    )
    return null
  }
  logger.info(
    {...logContext, txHash: txHash.value},
    'Submitted rewards fold transaction',
  )

  return txHash
}
