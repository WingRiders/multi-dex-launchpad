import {BrowserWallet, type UTxO} from '@meshsdk/core'
import {
  type QueryClient,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {getWalletCollateralUtxo} from '@wingriders/multi-dex-launchpad-common'
import {useCallback} from 'react'
import {useShallow} from 'zustand/shallow'
import {queryKeyFactory} from '@/helpers/query-key'
import {prefetchTokensMetadata} from '@/metadata/queries'
import {useConnectedWalletStore} from '@/store/connected-wallet'
import {useTRPC} from '@/trpc/client'

export const invalidateWalletQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({queryKey: queryKeyFactory.wallet()})
  queryClient.resetQueries({queryKey: queryKeyFactory.walletMutation()})
}

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

export const useWalletUtxosQuery = () => {
  const wallet = useConnectedWalletStore(
    useShallow((state) => state.connectedWallet?.wallet),
  )

  return useQuery({
    queryKey: queryKeyFactory.walletUtxos(),
    queryFn: wallet ? () => wallet.getUtxos() : skipToken,
  })
}

type UseWalletCollateralUtxoQueryArgs = {
  walletUtxos?: UTxO[]
  isLoadingWalletUtxos?: boolean
}

export const useWalletCollateralUtxoQuery = ({
  walletUtxos,
  isLoadingWalletUtxos,
}: UseWalletCollateralUtxoQueryArgs) => {
  const wallet = useConnectedWalletStore(
    useShallow((state) => state.connectedWallet?.wallet),
  )

  return useQuery({
    queryKey: queryKeyFactory.walletCollateralUtxo(),
    queryFn: wallet
      ? () =>
          getWalletCollateralUtxo(
            wallet,
            // If we are loading wallet utxos, don't try to load them again in getWalletCollateralUtxo.
            // If walletUtxos is undefined and isLoadingWalletUtxos is falsy, then we will load utxos from
            // the wallet API in getWalletCollateralUtxo.
            walletUtxos ?? (isLoadingWalletUtxos ? [] : undefined),
          )
      : skipToken,
  })
}

export const useSignTxMutation = () => {
  const wallet = useConnectedWalletStore(
    useShallow((state) => state.connectedWallet?.wallet),
  )

  return useMutation({
    mutationKey: queryKeyFactory.signTx(),
    mutationFn: async (args: {tx: string; partialSign?: boolean}) => {
      if (!wallet) throw new Error('Wallet not connected')
      return wallet.signTx(args.tx, args.partialSign)
    },
  })
}

export const useSubmitTxMutation = () => {
  const wallet = useConnectedWalletStore(
    useShallow((state) => state.connectedWallet?.wallet),
  )

  return useMutation({
    mutationKey: queryKeyFactory.submitTx(),
    mutationFn: async (tx: string) => {
      if (!wallet) throw new Error('Wallet not connected')
      return wallet.submitTx(tx)
    },
  })
}

export const useSignAndSubmitTxMutation = () => {
  const {
    mutateAsync: signTx,
    reset: resetSignTx,
    ...signTxMutationResult
  } = useSignTxMutation()

  const {
    mutateAsync: submitTx,
    reset: resetSubmitTx,
    ...submitTxMutationResult
  } = useSubmitTxMutation()

  const signAndSubmitTx = useCallback(
    async (tx: string, partialSign?: boolean) => {
      try {
        const signedTx = await signTx({tx, partialSign})
        const txHash = await submitTx(signedTx)
        return {txHash}
      } catch {
        // pass, the error is handled in the mutation results
      }
    },
    [signTx, submitTx],
  )

  const reset = useCallback(() => {
    resetSignTx()
    resetSubmitTx()
  }, [resetSignTx, resetSubmitTx])

  return {
    signAndSubmitTx,
    reset,
    isPending:
      signTxMutationResult.isPending || submitTxMutationResult.isPending,
    isError: signTxMutationResult.isError || submitTxMutationResult.isError,
    signTxMutationResult,
    submitTxMutationResult,
  }
}
