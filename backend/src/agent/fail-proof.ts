import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  buildTx,
  calculateTxValidityInterval,
  commitFoldRedeemerToMeshData,
  constantRefScriptsByNetwork,
  createUnit,
  ensure,
  failProofDatumToMeshData,
  type GeneratedContracts,
  LOVELACE_UNIT,
  makeBuilder,
  networkToNetworkId,
  nodeRedeemerToMeshData,
  tokensHolderFirstRedeemerToMeshData,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import {
  type CommitFold,
  type Launch,
  type RefScriptCarrier,
  RefScriptCarrierType,
  type TxOutput,
} from '../../prisma/generated/client'
import {config} from '../config'
import {prismaTxOutputToMeshOutput} from '../db/helpers'
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
  getWalletPubKeyHash,
  trackSpentInputs,
} from './wallet'

export const createFailProof = async (
  launch: Launch & {
    refScriptCarriers: (RefScriptCarrier & {txOut: TxOutput})[]
  },
  contracts: GeneratedContracts,
  finishedCommitFold: CommitFold & {txOut: TxOutput},
  headNodeTxOutput: TxOutput,
  nodeValidatorRefScriptCarrier: TxOutput,
  nodePolicyRefScriptCarrier: TxOutput,
  firstTokenHolder: TxOutput,
) => {
  const launchTxHash = launch.txHash

  ensure(
    finishedCommitFold.ownerAddress === getWalletChangeAddress(),
    {
      launchTxHash,
      finishedCommitFold,
      walletChangeAddress: getWalletChangeAddress(),
    },
    'Owner address of the finished commit fold should equal the wallet change address',
  )

  const firstTokensHolderValidatorRefScriptCarrier =
    launch.refScriptCarriers.find(
      (c) =>
        c.type === RefScriptCarrierType.FIRST_PROJECT_TOKENS_HOLDER_VALIDATOR,
    )?.txOut
  ensure(
    firstTokensHolderValidatorRefScriptCarrier?.scriptCbor != null &&
      firstTokensHolderValidatorRefScriptCarrier?.scriptLanguage != null,
    {firstTokensHolderValidatorRefScriptCarrier},
    'First tokens holder validator ref script carrier script must always exist',
  )
  const firstTokensHolderValidatorRef = txOutputToRefScriptUtxo(
    firstTokensHolderValidatorRefScriptCarrier,
  )

  const tokensHolderPolicyRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.PROJECT_TOKENS_HOLDER_POLICY,
  )?.txOut
  ensure(
    tokensHolderPolicyRefScriptCarrier?.scriptCbor != null &&
      tokensHolderPolicyRefScriptCarrier?.scriptLanguage != null,
    {
      firstTokensHolderPolicyRefScriptCarrier:
        tokensHolderPolicyRefScriptCarrier,
    },
    'First tokens holder validator ref script carrier script must always exist',
  )
  const tokensHolderPolicyRef = txOutputToRefScriptUtxo(
    tokensHolderPolicyRefScriptCarrier,
  )

  const commitFoldValidatorRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.COMMIT_FOLD_VALIDATOR,
  )?.txOut
  ensure(
    commitFoldValidatorRefScriptCarrier?.scriptCbor != null &&
      commitFoldValidatorRefScriptCarrier?.scriptLanguage != null,
    {commitFoldValidatorRefScriptCarrier},
    'Commit fold validator ref script carrier script must always exist',
  )
  const commitFoldValidatorRef = txOutputToRefScriptUtxo(
    commitFoldValidatorRefScriptCarrier,
  )

  const commitFoldPolicyRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.COMMIT_FOLD_POLICY,
  )?.txOut
  ensure(
    commitFoldPolicyRefScriptCarrier?.scriptCbor != null &&
      commitFoldPolicyRefScriptCarrier?.scriptLanguage != null,
    {commitFoldPolicyRefScriptCarrier},
    'Commit fold validator ref script carrier script must always exist',
  )
  const commitFoldPolicyRef = txOutputToRefScriptUtxo(
    commitFoldPolicyRefScriptCarrier,
  )

  const nodeValidatorRef = txOutputToRefScriptUtxo(
    nodeValidatorRefScriptCarrier,
  )
  const nodePolicyRef = txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier)

  const headNodeUtxo = prismaTxOutputToMeshOutput(headNodeTxOutput)
  const finishedCommitFoldUtxo = prismaTxOutputToMeshOutput(
    finishedCommitFold.txOut,
  )
  const firstTokenHolderUtxo = prismaTxOutputToMeshOutput(firstTokenHolder)

  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )

  const walletUtxos = getSpendableWalletUtxos()
  b.selectUtxosFrom(walletUtxos)

  // Spend head node
  b.spendingPlutusScriptV2()
    .txIn(
      headNodeUtxo.input.txHash,
      headNodeUtxo.input.outputIndex,
      headNodeUtxo.output.amount,
      headNodeUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      nodeValidatorRef.input.txHash,
      nodeValidatorRef.input.outputIndex,
      nodeValidatorRef.scriptSize.toString(),
      nodeValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(nodeRedeemerToMeshData({type: 'fail-launch-redeemer'}))

  // burn the node validity token
  b.mintPlutusScript(contracts.nodePolicy.version)
    .mint('-1', contracts.nodePolicy.hash, contracts.nodeValidator.hash)
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // Spend first token holder
  b.spendingPlutusScriptV2()
    .txIn(
      firstTokenHolderUtxo.input.txHash,
      firstTokenHolderUtxo.input.outputIndex,
      firstTokenHolderUtxo.output.amount,
      firstTokenHolderUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      firstTokensHolderValidatorRef.input.txHash,
      firstTokensHolderValidatorRef.input.outputIndex,
      firstTokensHolderValidatorRef.scriptSize.toString(),
      firstTokensHolderValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      tokensHolderFirstRedeemerToMeshData('delegate-to-rewards-or-failure'),
    )

  // burn the tokens holder token
  b.mintPlutusScript(contracts.tokensHolderPolicy.version)
    .mint(
      '-1',
      contracts.tokensHolderPolicy.hash,
      contracts.tokensHolderFirstValidator.hash,
    )
    .mintTxInReference(
      tokensHolderPolicyRef.input.txHash,
      tokensHolderPolicyRef.input.outputIndex,
      tokensHolderPolicyRef.scriptSize.toString(),
      tokensHolderPolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // Spend finished commit fold
  b.spendingPlutusScriptV2()
    .txIn(
      finishedCommitFoldUtxo.input.txHash,
      finishedCommitFoldUtxo.input.outputIndex,
      finishedCommitFoldUtxo.output.amount,
      finishedCommitFoldUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      commitFoldValidatorRef.input.txHash,
      commitFoldValidatorRef.input.outputIndex,
      commitFoldValidatorRef.scriptSize.toString(),
      commitFoldValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      commitFoldRedeemerToMeshData({type: 'delegate-commit-to-node'}),
    )

  // burn the commit fold validity token
  b.mintPlutusScript(contracts.commitFoldPolicy.version)
    .mint(
      '-1',
      contracts.commitFoldPolicy.hash,
      contracts.commitFoldValidator.hash,
    )
    .mintTxInReference(
      commitFoldPolicyRef.input.txHash,
      commitFoldPolicyRef.input.outputIndex,
      commitFoldPolicyRef.scriptSize.toString(),
      commitFoldPolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // Output the fail proof
  const failProofValidatorAddress = scriptHashToBech32(
    CONSTANT_CONTRACTS.failProofValidator.hash,
    undefined,
    networkToNetworkId[config.NETWORK],
  )
  b.txOut(failProofValidatorAddress, [
    // Omit ada here - Mesh calculates required ada quantity automatically
    // If you add 0 ada manually here, Mesh would still calculate required ada, but would fail at balancing later
    {
      unit: createUnit(
        CONSTANT_CONTRACTS.failProofPolicy.hash,
        CONSTANT_CONTRACTS.failProofValidator.hash,
      ),
      quantity: '1',
    },
  ]).txOutInlineDatumValue(
    failProofDatumToMeshData({scriptHash: contracts.nodeValidator.hash}),
  )

  // Mint the fail proof token
  const failProofPolicyRef =
    constantRefScriptsByNetwork[config.NETWORK].failProofPolicy
  b.mintPlutusScript(CONSTANT_CONTRACTS.failProofPolicy.version)
    .mint(
      '1',
      CONSTANT_CONTRACTS.failProofPolicy.hash,
      CONSTANT_CONTRACTS.failProofValidator.hash,
    )
    .mintTxInReference(
      failProofPolicyRef.input.txHash,
      failProofPolicyRef.input.outputIndex,
      failProofPolicyRef.scriptSize.toString(),
      failProofPolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // Return project tokens to launch owner
  b.txOut(launch.ownerBech32Address, [
    {
      unit: createUnit(
        launch.projectTokenPolicyId,
        launch.projectTokenAssetName,
      ),
      quantity: launch.totalTokens.toString(),
    },
  ])

  // Compensate commit fold owner
  const commitFoldCompensationLovelace =
    launch.commitFoldFeeAda * BigInt(finishedCommitFold.nodeCount)
  b.txOut(finishedCommitFold.ownerAddress, [
    {unit: LOVELACE_UNIT, quantity: commitFoldCompensationLovelace.toString()},
  ])

  // Pay the DAO if there's anything left after compensating the commit fold owner
  const daoFeeReceiverReward =
    launch.collateral - commitFoldCompensationLovelace
  if (daoFeeReceiverReward > 0n) {
    b.txOut(launch.daoFeeReceiverBech32Address, [
      {unit: LOVELACE_UNIT, quantity: daoFeeReceiverReward.toString()},
    ])
  }

  // Validity interval
  const {validityStartSlot, validityEndSlot} = calculateTxValidityInterval(
    config.NETWORK,
  )
  b.invalidBefore(validityStartSlot).invalidHereafter(validityEndSlot)

  setFetcherUtxos([
    ...walletUtxos,
    headNodeUtxo,
    finishedCommitFoldUtxo,
    firstTokenHolderUtxo,
    commitFoldPolicyRef,
    commitFoldValidatorRef,
    nodeValidatorRef,
    nodePolicyRef,
    firstTokensHolderValidatorRef,
    tokensHolderPolicyRef,
    failProofPolicyRef,
  ])

  // Collateral
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')

  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )

  b.requiredSignerHash(getWalletPubKeyHash())

  const unsignedTx = await buildTx(b)
  if (unsignedTx.isErr()) {
    logger.error(
      {
        error: unsignedTx.error,
        txBuilderBody: getMeshBuilderBodyForLogging(b),
      },
      `Error when building transaction: ${unsignedTx.error.message}`,
    )
    return null
  }

  trackSpentInputs(b)

  const signedTx = await wallet.signTx(unsignedTx.value)
  logger.info({launchTxHash, signedTx}, 'Submitting fail proof transaction...')
  const txHash = await Result.tryPromise(() => submitTx(signedTx))
  if (txHash.isErr()) {
    logger.error(
      {
        txBuilderBody: getMeshBuilderBodyForLogging(b),
        signedTx,
        error: txHash.error,
        cause: txHash.error.cause, // txHash.error.cause.data is omitted above
      },
      `Error when submitting transaction: ${txHash.error.message}`,
    )
    return null
  }
  logger.info(
    {launchTxHash, txHash: txHash.value},
    'Submitted fail proof transaction',
  )
  return txHash.value
}
