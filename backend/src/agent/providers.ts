import type {UTxO} from '@meshsdk/common'
import {OfflineFetcher, OgmiosProvider} from '@meshsdk/core'
import {config} from '../config'
import {
  ogmiosProtocolParametersToMeshProtocolParameters,
  ogmiosUtxoToMeshUtxo,
} from './ogmios/helpers'
import {
  getCurrentEpoch,
  getProtocolParameters,
  getUtxos,
} from './ogmios/ledger-state-query'
import {getWalletChangeAddress} from './wallet'

export const ogmiosProvider = new OgmiosProvider(
  `http://${config.OGMIOS_HOST}:${config.OGMIOS_PORT}`,
)

const fetcher = new OfflineFetcher(config.NETWORK)

export const getFetcher = () => fetcher

// Use this when running agent (e.g. when resetting tracked UTxOs)
export const setFetcherUtxos = (utxos: UTxO[]) => {
  // @ts-expect-error accessing internal field (Mesh has no public reset)
  fetcher.utxos = new Map()

  fetcher.addUTxOs(utxos)
}

// Use this when running agent (on startup and on new epoch)
export const updateFetcherProtocolParametersFromOgmios = async () => {
  // No need to reset because internal field is a mapping with key = epoch and params can change only on epoch switch
  fetcher.addProtocolParameters(
    ogmiosProtocolParametersToMeshProtocolParameters(
      await getProtocolParameters(),
      await getCurrentEpoch(),
    ),
  )
}

// Use this when running CLI
export const updateFetcherFromOgmios = async () => {
  setFetcherUtxos(
    (await getUtxos([getWalletChangeAddress()])).map(ogmiosUtxoToMeshUtxo),
  )
  await updateFetcherProtocolParametersFromOgmios()
}

const coreCsl = await import('@meshsdk/core-csl')
export const offlineEvaluator = new coreCsl.OfflineEvaluator(
  fetcher,
  config.NETWORK,
)
