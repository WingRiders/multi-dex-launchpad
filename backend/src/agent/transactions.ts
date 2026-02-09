import type {MeshTxBuilder} from '@meshsdk/core'
import {
  addRefScriptCarrier,
  buildTx,
  type Contract,
  ensure,
  getLogContextFromTxBuilderBody,
  getTxInParameterUtxoId,
  makeBuilder,
  type RefScriptCarrierDatum,
} from '@wingriders/multi-dex-launchpad-common'
import {config} from '../config'
import {logger} from '../logger'
import {submitTx} from './ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from './providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  getWalletPubKeyHash,
  trackSpentUtxo,
} from './wallet'

// NOTE: we don't _need_ to track spent non-wallet utxos,
//       but we still do
const trackSpentInputs = (b: MeshTxBuilder) =>
  b.meshTxBuilderBody.inputs.forEach((input) => {
    trackSpentUtxo(getTxInParameterUtxoId(input.txIn))
  })

export const deployContracts = async (
  contracts: Contract[],
): Promise<string | null> => {
  ensure(contracts.length > 0, "Can't deploy 0 contracts")
  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )

  const walletUtxos = getSpendableWalletUtxos()
  b.selectUtxosFrom(walletUtxos)
  setFetcherUtxos(walletUtxos)

  const datum: RefScriptCarrierDatum = {
    ownerPubKeyHash: getWalletPubKeyHash(),
    // Since the owner is the agent, any deadline is fine
    deadline: 0,
  }
  for (const contract of contracts)
    addRefScriptCarrier(b, config.NETWORK, datum, contract)

  const unsignedTx = await buildTx(b)
  if (unsignedTx.isErr()) {
    logger.error(
      {
        error: unsignedTx.error,
        txBuilderBody: getLogContextFromTxBuilderBody(b.meshTxBuilderBody),
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
