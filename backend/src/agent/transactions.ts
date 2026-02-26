import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  buildTx,
  calculateTxValidityIntervalAfterLaunchEnd,
  commitFoldRedeemerToMeshData,
  createUnit,
  decodeDatum,
  ensure,
  type GeneratedContracts,
  getCommitFoldDatumCborSchema,
  LOVELACE_UNIT,
  makeBuilder,
  networkToNetworkId,
  nodeDatumCborSchema,
  nodeRedeemerToMeshData,
  rewardsFoldDatumToMeshData,
} from '@wingriders/multi-dex-launchpad-common'
import type {Launch, TxOutput} from '../../prisma/generated/client'
import {config} from '../config'
import {
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../db/helpers'
import {txOutputToRefScriptUtxo} from '../endpoints/ref-scripts'
import {logger} from '../logger'
import {getMeshBuilderBodyForLogging} from './helpers'
import {submitTx} from './ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from './providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  trackSpentInputs,
} from './wallet'

export const createRewardsFold = async (
  launch: Launch,
  contracts: GeneratedContracts,
  commitFoldValidatorRefScriptCarrier: TxOutput,
  commitFoldPolicyRefScriptCarrier: TxOutput,
  rewardsFoldPolicyRefScriptCarrier: TxOutput,
  nodeValidatorRefScriptCarrier: TxOutput,
  nodePolicyRefScriptCarrier: TxOutput,
  finishedCommitFoldTxOutput: TxOutput,
  headNodeTxOutput: TxOutput,
): Promise<string | null> => {
  const launchConfig = prismaLaunchToLaunchConfig(launch)

  const headNode = prismaTxOutputToMeshOutput(headNodeTxOutput)
  ensure(headNode.output.plutusData != null, {headNode}, 'Node must have datum')
  const headNodeDatum = decodeDatum(
    nodeDatumCborSchema,
    headNode.output.plutusData,
  )
  ensure(headNodeDatum != null, {headNode}, 'Node datum must be valid')
  const finishedCommitFold = prismaTxOutputToMeshOutput(
    finishedCommitFoldTxOutput,
  )
  ensure(
    finishedCommitFold.output.plutusData != null,
    {finishedCommitFold},
    'Commit fold must have datum',
  )
  const commitFoldDatum = decodeDatum(
    getCommitFoldDatumCborSchema(config.NETWORK),
    finishedCommitFold.output.plutusData,
  )
  ensure(
    commitFoldDatum != null,
    {finishedCommitFold},
    'Commit fold must be valid',
  )
  const commitFoldValidatorRef = txOutputToRefScriptUtxo(
    commitFoldValidatorRefScriptCarrier,
  )
  const commitFoldPolicyRef = txOutputToRefScriptUtxo(
    commitFoldPolicyRefScriptCarrier,
  )
  const rewardsFoldPolicyRef = txOutputToRefScriptUtxo(
    rewardsFoldPolicyRefScriptCarrier,
  )
  const nodeValidatorRef = txOutputToRefScriptUtxo(
    nodeValidatorRefScriptCarrier,
  )
  const nodePolicyRef = txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier)

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
    commitFoldValidatorRef,
    commitFoldPolicyRef,
    rewardsFoldPolicyRef,
    headNode,
    finishedCommitFold,
    nodeValidatorRef,
    nodePolicyRef,
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

  // spend the head node
  b.spendingPlutusScriptV2()
    .txIn(
      headNode.input.txHash,
      headNode.input.outputIndex,
      headNode.output.amount,
      headNode.output.address,
      0,
    )
    .spendingTxInReference(
      nodeValidatorRef.input.txHash,
      nodeValidatorRef.input.outputIndex,
      nodeValidatorRef.scriptSize.toString(),
      nodeValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(nodeRedeemerToMeshData({type: 'start-rewards-fold'}))

  // burn the node validity token
  b.mintPlutusScriptV2()
    .mint('-1', contracts.nodePolicy.hash, contracts.nodeValidator.hash)
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // spend the finished commit fold
  b.spendingPlutusScriptV2()
    .txIn(
      finishedCommitFold.input.txHash,
      finishedCommitFold.input.outputIndex,
      finishedCommitFold.output.amount,
      finishedCommitFold.output.address,
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
  b.mintPlutusScriptV2()
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

  // create the rewards fold
  b.txOut(
    scriptHashToBech32(
      contracts.rewardsFoldValidator.hash,
      undefined,
      networkToNetworkId[config.NETWORK],
    ),
    // oil ada + validity token
    [
      {
        unit: LOVELACE_UNIT,
        // TODO: ideally, the change should go directly to the rewards fold
        //       It is definitely not supported by Mesh:
        //       https://github.com/MeshJS/mesh/issues/800
        //       The same is needed for rewards folding
        //       The code works without it, but it's not ideal
        quantity: launchConfig.oilAda.toString(),
      },
      {
        unit: createUnit(
          contracts.rewardsFoldPolicy.hash,
          contracts.rewardsFoldValidator.hash,
        ),
        quantity: '1',
      },
    ],
  ).txOutInlineDatumValue(
    rewardsFoldDatumToMeshData({
      nodeScriptHash: contracts.nodeValidator.hash,
      next: headNodeDatum.next,
      committed: commitFoldDatum.committed,
      cutoffKey: commitFoldDatum.cutoffKey,
      cutoffTime: commitFoldDatum.cutoffTime,
      overcommitted: commitFoldDatum.overcommitted,
      commitFoldOwner: commitFoldDatum.owner,
    }),
  )

  // mint the rewards fold validity token
  b.mintPlutusScriptV2()
    .mint(
      '1',
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
  const txHash = await submitTx(signedTx)
  return txHash
}
