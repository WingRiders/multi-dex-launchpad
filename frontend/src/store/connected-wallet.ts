import {BrowserWallet} from '@meshsdk/core'
import type {QueryClient} from '@tanstack/react-query'
import {
  type Network,
  walletNetworkIdToNetwork,
} from '@wingriders/multi-dex-launchpad-common'
import {create} from 'zustand'
import {persist} from 'zustand/middleware'
import {queryKeyFactory} from '@/helpers/query-key'
import {
  type SupportedWalletType,
  supportedWalletsInfo,
} from '../wallet/supported-wallets'

const WAIT_FOR_WALLET_EXTENSION_MAX_ATTEMPTS = 5
const WAIT_FOR_WALLET_EXTENSION_DELAY_MS = 300

const waitForWalletExtension = async (walletId: string) => {
  for (let i = 0; i < WAIT_FOR_WALLET_EXTENSION_MAX_ATTEMPTS; i++) {
    if (window.cardano?.[walletId] != null) return true
    await Bun.sleep(WAIT_FOR_WALLET_EXTENSION_DELAY_MS)
  }
  return false
}

export type ConnectedWallet = {
  wallet: BrowserWallet
  address: string
}

export type ConnectedWalletState = {
  connectedWalletType: SupportedWalletType | null
  connectedWallet: ConnectedWallet | null
  isWalletConnecting: boolean
  connectWallet: (
    walletType: SupportedWalletType,
    expectedNetwork: Network,
    walletApi?: BrowserWallet,
  ) => Promise<void>
  disconnectWallet: (queryClient: QueryClient) => void
  isHydrated: boolean
}

export const useConnectedWalletStore = create<ConnectedWalletState>()(
  persist(
    (set) => ({
      connectedWalletType: null,
      connectedWallet: null,
      isWalletConnecting: false,
      isHydrated: false,
      connectWallet: async (walletType, expectedNetwork, walletApi) => {
        set({isWalletConnecting: true})
        try {
          const walletId = supportedWalletsInfo[walletType].id
          // if connectWallet is called right after the page loads, the wallet extension might not be injected yet
          // so we wait for the extension to be injected
          const isExtensionInstalled = await waitForWalletExtension(walletId)
          if (!isExtensionInstalled) {
            throw new Error('Wallet extension not installed')
          }
          const wallet = walletApi ?? (await BrowserWallet.enable(walletId))
          const [address, networkId] = await Promise.all([
            wallet.getChangeAddress(),
            wallet.getNetworkId(),
          ])
          const walletNetwork = walletNetworkIdToNetwork(networkId)
          if (walletNetwork !== expectedNetwork) {
            throw new Error(
              `Cannot connect to wallet that is not on ${expectedNetwork} network`,
            )
          }
          set({
            connectedWallet: {
              wallet,
              address,
            },
            connectedWalletType: walletType,
            isWalletConnecting: false,
          })
        } catch (error) {
          set({
            isWalletConnecting: false,
            connectedWalletType: null,
            connectedWallet: null,
          })
          throw error
        }
      },
      disconnectWallet: (queryClient) => {
        set({
          connectedWalletType: null,
          connectedWallet: null,
        })
        // using setTimeout so that the invalidation is executed after the store state is updated in all components
        setTimeout(() => {
          queryClient.resetQueries({queryKey: queryKeyFactory.wallet()})
        }, 0)
      },
    }),
    {
      name: 'connected-wallet',
      partialize: ({connectedWalletType}) => ({
        connectedWalletType,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) state.isHydrated = true
        }
      },
    },
  ),
)
