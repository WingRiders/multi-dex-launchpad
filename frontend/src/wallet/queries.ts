import {BrowserWallet} from '@meshsdk/core'
import {useQuery} from '@tanstack/react-query'
import {queryKeyFactory} from '@/helpers/query-key'

export const useInstalledWalletsIdsQuery = () =>
  useQuery({
    queryKey: queryKeyFactory.installedWalletsIds(),
    queryFn: async () => {
      const wallets = await BrowserWallet.getAvailableWallets()
      return new Set(wallets.map((wallet) => wallet.id))
    },
  })
