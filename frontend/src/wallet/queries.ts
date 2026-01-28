import {BrowserWallet} from '@meshsdk/core'
import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {useShallow} from 'zustand/shallow'
import {queryKeyFactory} from '@/helpers/query-key'
import {prefetchTokensMetadata} from '@/metadata/queries'
import {useConnectedWalletStore} from '@/store/connected-wallet'
import {useTRPC} from '@/trpc/client'

export const useInstalledWalletsIdsQuery = () =>
  useQuery({
    queryKey: queryKeyFactory.installedWalletsIds(),
    queryFn: async () => {
      const wallets = await BrowserWallet.getAvailableWallets()
      return new Set(wallets.map((wallet) => wallet.id))
    },
  })

export type WalletBalanceState = 'loading' | 'has-data' | 'no-data'

export const useWalletBalanceQuery = () => {
  const {wallet, isWalletConnecting} = useConnectedWalletStore(
    useShallow((state) => ({
      wallet: state.connectedWallet?.wallet,
      isWalletConnecting: state.isWalletConnecting,
    })),
  )
  const queryClient = useQueryClient()
  const trpc = useTRPC()

  const queryResult = useQuery({
    queryKey: queryKeyFactory.walletBalance(),
    queryFn: wallet
      ? async () => {
          const balance = await wallet.getBalance()

          // prefetch metadata for all assets in the wallet
          await prefetchTokensMetadata(
            balance.map((asset) => asset.unit),
            queryClient,
            trpc,
          )

          return Object.fromEntries(
            balance.map(({unit, quantity}) => [unit, BigInt(quantity)]),
          )
        }
      : skipToken,
  })

  const balanceState: WalletBalanceState = queryResult.isLoading
    ? 'loading'
    : queryResult.data != null
      ? 'has-data'
      : 'no-data'

  return {
    ...queryResult,
    isLoading: queryResult.isLoading || isWalletConnecting,
    balanceState,
  }
}

export type WalletBalance = Exclude<
  ReturnType<typeof useWalletBalanceQuery>['data'],
  undefined
>
