import type {UTxO} from '@meshsdk/common'
import {OfflineFetcher, OgmiosProvider} from '@meshsdk/core'
import {config} from '../config'
import {ogmiosUtxoToMeshUtxo} from './ogmios/helpers'
import {getUtxos} from './ogmios/ledger-state-query'
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
// Use this when running CLI
export const updateFetcherFromOgmios = async () => {
  setFetcherUtxos(
    (await getUtxos([getWalletChangeAddress()])).map(ogmiosUtxoToMeshUtxo),
  )
}
