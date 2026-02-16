import type {TxInput} from '@meshsdk/common'
import type {UTxO} from '@meshsdk/core'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  buildTx,
  type CommitFoldDatum,
  commitFoldDatumToMeshData,
  createUnit,
  DEFAULT_TX_TTL_SLOTS,
  ensure,
  type GeneratedContracts,
  LOVELACE_UNIT,
  makeBuilder,
  networkToNetworkId,
} from '@wingriders/multi-dex-launchpad-common'
import {orderBy} from 'es-toolkit'
import {findIndex} from 'es-toolkit/compat'
import {commitFoldRedeemerToMeshData} from '../../../../common/src/redeemers'
import {
  type Launch,
  type Node,
  type RefScriptCarrier,
  RefScriptCarrierType,
  type TxOutput,
} from '../../../prisma/generated/client'
import {config} from '../../config'
import {
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../../db/helpers'
import {txOutputToRefScriptUtxo} from '../../endpoints/ref-scripts'
import {logger} from '../../logger'
import {submitTx} from '../ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from '../providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  getWalletPubKeyHash,
  trackSpentInputs,
} from '../wallet'

const getNodeIndices = (
  nodeRefInputs: TxInput[],
  commitFoldValidatorRefInput: TxInput,
) => {
  const sortedInputs = orderBy(
    [...nodeRefInputs, commitFoldValidatorRefInput],
    ['txHash', 'outputIndex'],
    ['asc', 'asc'],
  )
  return nodeRefInputs.map((nodeInput) =>
    findIndex(
      sortedInputs,
      (input) =>
        nodeInput.txHash === input.txHash &&
        nodeInput.outputIndex === input.outputIndex,
    ),
  )
}

type BuildAndSubmitCommitFoldTxParams = {
  latestDbCommitFold?: UTxO
  commitFoldDatum: CommitFoldDatum
  nodes: (Node & {txOut: TxOutput})[]
  launch: Launch & {refScriptCarriers: (RefScriptCarrier & {txOut: TxOutput})[]}
  contracts: GeneratedContracts
  latestSlot: number
}

export const buildAndSubmitCommitFoldTx = async ({
  latestDbCommitFold,
  commitFoldDatum,
  nodes,
  launch,
  contracts,
  latestSlot,
}: BuildAndSubmitCommitFoldTxParams) => {
  const launchConfig = prismaLaunchToLaunchConfig(launch)

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

  const commitFoldValidatorAddress = scriptHashToBech32(
    contracts.commitFoldValidator.hash,
    undefined,
    networkToNetworkId[config.NETWORK],
  )

  const commitFoldPolicyRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.COMMIT_FOLD_POLICY,
  )?.txOut
  ensure(
    commitFoldPolicyRefScriptCarrier?.scriptCbor != null &&
      commitFoldPolicyRefScriptCarrier?.scriptLanguage != null,
    {commitFoldPolicyRefScriptCarrier},
    'Commit fold policy ref script carrier script must always exist',
  )
  const commitFoldPolicyRef = txOutputToRefScriptUtxo(
    commitFoldPolicyRefScriptCarrier,
  )

  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )

  // Wallet UTxOs
  const walletUtxos = getSpendableWalletUtxos()
  b.selectUtxosFrom(walletUtxos)

  const nodeUtxos = nodes.map((node) => prismaTxOutputToMeshOutput(node.txOut))
  const nodeReferenceInputs: TxInput[] = nodeUtxos.map(
    (nodeUtxo) => nodeUtxo.input,
  )

  if (latestDbCommitFold != null) {
    // Spend previous commit fold
    b.spendingPlutusScriptV2()
      .txIn(
        latestDbCommitFold.input.txHash,
        latestDbCommitFold.input.outputIndex,
        latestDbCommitFold.output.amount,
        latestDbCommitFold.output.address,
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
        commitFoldRedeemerToMeshData({
          type: 'commit-fold',
          nodes: getNodeIndices(
            nodeReferenceInputs,
            commitFoldValidatorRef.input,
          ),
        }),
      )
  }

  // Set reference inputs for nodes in the batch
  nodeReferenceInputs.forEach((nodeReferenceInput) => {
    b.readOnlyTxInReference(
      nodeReferenceInput.txHash,
      nodeReferenceInput.outputIndex,
    )
  })

  // Output the new commit fold
  b.txOut(commitFoldValidatorAddress, [
    {
      unit: LOVELACE_UNIT,
      quantity: launchConfig.oilAda.toString(),
    },
    {
      unit: createUnit(
        contracts.commitFoldPolicy.hash,
        contracts.commitFoldValidator.hash,
      ),
      quantity: '1',
    },
  ]).txOutInlineDatumValue(commitFoldDatumToMeshData(commitFoldDatum))

  if (latestDbCommitFold == null) {
    // Initial commit fold: Mint new commit fold token
    b.mintPlutusScriptV2()
      .mint(
        '1',
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
  }

  // Validity interval
  b.invalidBefore(latestSlot).invalidHereafter(
    latestSlot + DEFAULT_TX_TTL_SLOTS,
  )

  setFetcherUtxos([
    ...walletUtxos,
    ...nodeUtxos,
    ...(latestDbCommitFold ? [latestDbCommitFold] : []),
    commitFoldPolicyRef,
    commitFoldValidatorRef,
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
        txBuilderBody: b.meshTxBuilderBody,
      },
      `Error when building transaction: ${unsignedTx.error.message}`,
    )
    return null
  }

  trackSpentInputs(b)

  const signedTx = await wallet.signTx(unsignedTx.value)
  logger.info(
    {launchTxHash: launch.txHash, signedTx},
    'Submitting commit fold transaction...',
  )
  const txHash = await submitTx(signedTx)
  logger.info(
    {launchTxHash: launch.txHash, txHash},
    'Submitted commit fold transaction',
  )
  return txHash
}
