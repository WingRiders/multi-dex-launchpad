import {deserializeAddress, MeshWallet} from '@meshsdk/core'
import {
  ensure,
  networkToNetworkId,
} from '@wingriders/multi-dex-launchpad-common'
import {config} from '../config'
import {fetcher, ogmiosSubmitter} from './providers'

let wallet: MeshWallet | undefined
let walletPubKeyHash: string | undefined

export const initWallet = async () => {
  ensure(config.WALLET_MNEMONIC != null, 'The mnemonic is not provided')
  ensure(
    config.WALLET_ACCOUNT_INDEX != null,
    'The wallet account index is not provided',
  )
  wallet = new MeshWallet({
    networkId: networkToNetworkId[config.NETWORK],
    fetcher,
    submitter: ogmiosSubmitter,
    key: {type: 'mnemonic', words: config.WALLET_MNEMONIC.split(' ')},
    accountIndex: config.WALLET_ACCOUNT_INDEX,
  })
  await wallet.init()
  walletPubKeyHash = deserializeAddress(
    await wallet.getChangeAddress(),
  ).pubKeyHash
}

export const getWallet = (): MeshWallet => {
  ensure(wallet != null, 'Wallet is not initialized')
  return wallet
}

export const getWalletPubKeyHash = (): string => {
  ensure(walletPubKeyHash != null, 'Wallet is not initialized')
  return walletPubKeyHash
}
