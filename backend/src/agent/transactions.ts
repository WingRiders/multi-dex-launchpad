import type {Value} from '@cardano-ogmios/schema'
import type {UTxO} from '@meshsdk/common'
import {
  addRefScriptCarrier,
  buildTx,
  type Contract,
  ensure,
  generateConstantContracts,
  getLogContextFromTxBuilderBody,
  makeBuilder,
  type RefScriptCarrierDatum,
  SUNDAE_POOL_SCRIPT_HASH,
  WR_POOL_SYMBOL,
  WR_POOL_VALIDATOR_HASH,
} from '@wingriders/multi-dex-launchpad-common'
import superjson, {type SuperJSONResult} from 'superjson'
import type {TxOutput} from '../../prisma/generated/client'
import {config} from '../config'
import {logger} from '../logger'
import {getAddressTrackedUtxos} from './ogmios/chain-sync'
import {ogmiosValueToMeshAssets} from './ogmios/helpers'
import {submitTx} from './ogmios/tx-submission-client'
import {ogmiosProvider, setFetcherUtxos} from './providers'
import {getWallet, getWalletChangeAddress, getWalletPubKeyHash} from './wallet'

export const deployConstantContracts = async (): Promise<string | null> => {
  const constantContracts = await generateConstantContracts({
    wrPoolValidatorHash: WR_POOL_VALIDATOR_HASH[config.NETWORK],
    wrPoolSymbol: WR_POOL_SYMBOL[config.NETWORK],
    sundaePoolScriptHash: SUNDAE_POOL_SCRIPT_HASH[config.NETWORK],
  })
  const contracts = [
    constantContracts.failProofValidator,
    constantContracts.failProofPolicy,
    constantContracts.poolProofValidator,
    constantContracts.poolProofPolicy,
  ]
  const txHash = await deployContracts(contracts)
  if (txHash) logger.info({txHash}, 'Deployed constant contracts')
  else logger.error('Failed to deploy constant contracts')
  return txHash
}

export const txOutputToMeshOutput = (output: TxOutput): UTxO => {
  // TODO: ensure the shape
  const value: Value = superjson.deserialize(
    output.value as unknown as SuperJSONResult,
  )

  return {
    input: {
      txHash: output.txHash,
      outputIndex: output.outputIndex,
    },
    output: {
      address: output.address,
      amount: ogmiosValueToMeshAssets(value, {
        includeAda: true,
      }),
      dataHash: output.datumHash ?? undefined,
      plutusData: output.datum ?? undefined,
    },
  }
}

export const deployContracts = async (
  contracts: Contract[],
): Promise<string | null> => {
  ensure(contracts.length > 0, "Can't deploy 0 contracts")
  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    ogmiosProvider,
  )

  // NOTE: we assume only utxos on the change address
  //       are allowed to be spent
  // REVIEW: did we want to fetch from Ogmios?
  // TODO: handle utxo selection better
  //       when submitting multiple txs at the same time
  //       it's very likely some input utxos have already been spent
  //       but Ogmios haven't yet shared the info with us
  const walletUtxos = getAddressTrackedUtxos(getWalletChangeAddress()).map(
    txOutputToMeshOutput,
  )
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
  const signedTx = await wallet.signTx(unsignedTx.value)
  const txHash = await submitTx(signedTx)
  return txHash
}
