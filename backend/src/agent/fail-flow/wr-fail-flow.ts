import {
  calculateTxValidityInterval,
  createUnit,
  ensure,
  tokensHolderFinalRedeemerToMeshData,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import type {Launch, TxOutput} from '../../../prisma/generated/client'
import {config} from '../../config'
import {prismaTxOutputToMeshOutput} from '../../db/helpers'
import {txOutputToRefScriptUtxo} from '../../endpoints/ref-scripts'
import {logger} from '../../logger'
import {getMeshBuilderBodyForLogging} from '../helpers'
import {submitTx} from '../ogmios/tx-submission-client'
import {setFetcherUtxos} from '../providers'
import {buildTx, makeBuilder} from '../transactions'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  getWalletPubKeyHash,
} from '../wallet'

// Fail flow is triggered for a successful launch, when the pool cannot be created because it already exists
export const createWrFailFlow = async (
  launch: Launch,
  wrPoolProofTxOutput: TxOutput,
  finalProjectTokensHolderTxOutput: TxOutput,
  finalProjectTokensHolderValidatorRefScriptCarrier: TxOutput,
) => {
  const launchTxHash = launch.txHash

  logger.info(
    {launchTxHash},
    'Creating fail-flow for WR (we have pool proof and unspent final project tokens holder)',
  )

  const finalProjectTokensHolderUtxo = prismaTxOutputToMeshOutput(
    finalProjectTokensHolderTxOutput,
  )
  const raisingTokenUnit = createUnit(
    launch.raisingTokenPolicyId,
    launch.raisingTokenAssetName,
  )
  const projectTokenUnit = createUnit(
    launch.projectTokenPolicyId,
    launch.projectTokenAssetName,
  )
  const finalProjectTokensHolderRaisingToken =
    finalProjectTokensHolderUtxo.output.amount.find(
      ({unit}) => unit === raisingTokenUnit,
    )
  ensure(
    finalProjectTokensHolderRaisingToken != null,
    {launchTxHash, finalProjectTokensHolderUtxo},
    'finalProjectTokensHolderUtxo should contain raising token',
  )
  const numRaisedTokens = BigInt(finalProjectTokensHolderRaisingToken.quantity)
  const finalProjectTokensHolderProjectToken =
    finalProjectTokensHolderUtxo.output.amount.find(
      ({unit}) => unit === projectTokenUnit,
    )
  ensure(
    finalProjectTokensHolderProjectToken != null,
    {launchTxHash, finalProjectTokensHolderUtxo},
    'finalProjectTokensHolderUtxo should contain project token',
  )
  const numProjectTokens = BigInt(finalProjectTokensHolderProjectToken.quantity)

  const finalProjectTokensHolderValidatorRef = txOutputToRefScriptUtxo(
    finalProjectTokensHolderValidatorRefScriptCarrier,
  )

  const wallet = getWallet()

  const b = makeBuilder(getWalletChangeAddress())

  // Wallet UTxOs
  const walletUtxos = getSpendableWalletUtxos()
  b.selectUtxosFrom(walletUtxos)

  // Spend final token holder
  b.spendingPlutusScriptV2()
    .txIn(
      finalProjectTokensHolderUtxo.input.txHash,
      finalProjectTokensHolderUtxo.input.outputIndex,
      finalProjectTokensHolderUtxo.output.amount,
      finalProjectTokensHolderUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      finalProjectTokensHolderValidatorRef.input.txHash,
      finalProjectTokensHolderValidatorRef.input.outputIndex,
      finalProjectTokensHolderValidatorRef.scriptSize.toString(),
      finalProjectTokensHolderValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(tokensHolderFinalRedeemerToMeshData('failed-flow'))

  // Pool proof reference input
  b.readOnlyTxInReference(
    wrPoolProofTxOutput.txHash,
    wrPoolProofTxOutput.outputIndex,
  )

  // DAO output
  b.txOut(launch.daoFeeReceiverBech32Address, [
    {
      unit: raisingTokenUnit,
      quantity: numRaisedTokens.toString(),
    },
    {
      unit: projectTokenUnit,
      quantity: numProjectTokens.toString(),
    },
  ])

  // Validity interval
  const {validityStartSlot, validityEndSlot} = calculateTxValidityInterval(
    config.NETWORK,
  )
  b.invalidBefore(validityStartSlot).invalidHereafter(validityEndSlot)

  setFetcherUtxos([
    ...walletUtxos,
    finalProjectTokensHolderUtxo,
    finalProjectTokensHolderValidatorRef,
    prismaTxOutputToMeshOutput(wrPoolProofTxOutput),
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
    return
  }

  const signedTx = await wallet.signTx(unsignedTx.value)
  logger.info(
    {launchTxHash, signedTx},
    'Submitting WR fail-flow transaction...',
  )
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
    return
  }
  logger.info(
    {launchTxHash, txHash: txHash.value},
    'Submitted WR fail-flow transaction',
  )
}
