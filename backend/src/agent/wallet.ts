import {deserializeAddress, MeshWallet, type UTxO} from '@meshsdk/core'
import {
  ensure,
  getUtxoId,
  networkToNetworkId,
} from '@wingriders/multi-dex-launchpad-common'
import {config} from '../config'
import {logger} from '../logger'
import {ogmiosUtxoToMeshUtxo} from './ogmios/helpers'
import {getUtxos} from './ogmios/ledger-state-query'
import {getFetcher, ogmiosProvider} from './providers'

let wallet: MeshWallet | undefined
let walletChangeAddress: string | undefined
let walletPubKeyHash: string | undefined
let walletStakeKeyHash: string | undefined

export const initWallet = async () => {
  ensure(config.WALLET_MNEMONIC != null, 'The mnemonic is not provided')
  ensure(
    config.WALLET_ACCOUNT_INDEX != null,
    'The wallet account index is not provided',
  )
  wallet = new MeshWallet({
    networkId: networkToNetworkId[config.NETWORK],
    fetcher: getFetcher(),
    submitter: ogmiosProvider,
    key: {type: 'mnemonic', words: config.WALLET_MNEMONIC.split(' ')},
    accountIndex: config.WALLET_ACCOUNT_INDEX,
  })
  await wallet.init()
  walletChangeAddress = await wallet.getChangeAddress()
  const deserializedAddress = deserializeAddress(walletChangeAddress)
  walletPubKeyHash = deserializedAddress.pubKeyHash
  walletStakeKeyHash = deserializedAddress.stakeCredentialHash
}

export const getWallet = (): MeshWallet => {
  ensure(wallet != null, 'Wallet is not initialized')
  return wallet
}

export const getWalletChangeAddress = (): string => {
  ensure(walletChangeAddress != null, 'Wallet is not initialized')
  return walletChangeAddress
}

export const getWalletPubKeyHash = (): string => {
  ensure(walletPubKeyHash != null, 'Wallet is not initialized')
  return walletPubKeyHash
}

export const getWalletStakeKeyHash = (): string => {
  ensure(walletStakeKeyHash != null, 'Wallet is not initialized')
  return walletStakeKeyHash
}

// Here's how the utxo selection works:
// - we have a cache of raw available wallet utxos from ogmios
// - we have a cache of spent wallet utxos
// we derive the spendable by taking a set difference
//
// spent utxos have 10 blocks TTL
// then they're dropped
//
// they are either included in the new available utxos
// if the tx didn't make it onchain;
//
// or the tx has landed and Ogmios doesn't return it anymore
//
// in case it does make it in >10 blocks
// we submit a failing transaction, it's fine
//
// we do not handle rollbacks in any special way
// rollbacked spent utxos will become available in 10 blokcs

const availableWalletUtxos: Set<UTxO> = new Set()
const SPENT_WALLET_UTXOS_TTL = 10
// utxo id -> ttl
const spentUtxosTtl: Record<string, number> = {}

// Hopefully, we don't need a mutex because
// we don't await after fetching
const fetchWalletUtxosFromOgmios = async () => {
  const utxos = await getUtxos([getWalletChangeAddress()])
  availableWalletUtxos.clear()
  for (const utxo of utxos) {
    if (utxo.datum || utxo.datumHash || utxo.script) {
      logger.warn({utxo}, 'Wallet utxo has datum or datum hash or script')
      continue
    }

    availableWalletUtxos.add(ogmiosUtxoToMeshUtxo(utxo))
  }
}

const tickSpentUtxosTtl = () => {
  for (const utxoId of Object.keys(spentUtxosTtl)) {
    spentUtxosTtl[utxoId]! -= 1
    if (spentUtxosTtl[utxoId]! <= 0) delete spentUtxosTtl[utxoId]
  }
}

// Fetch the utxos from Ogmios and tick the spent utxos TTL
export const updateWalletUtxos = async () => {
  await fetchWalletUtxosFromOgmios()
  tickSpentUtxosTtl()
}

export const trackSpentUtxo = (utxoId: string) => {
  spentUtxosTtl[utxoId] = SPENT_WALLET_UTXOS_TTL
}

// NOTE: only utxos on the wallet change address are allowed to be spent
export const getSpendableWalletUtxos = (): UTxO[] => {
  const spent = new Set(Object.keys(spentUtxosTtl))
  return availableWalletUtxos
    .values()
    .filter((utxo) => !spent.has(getUtxoId(utxo)))
    .toArray()
}
