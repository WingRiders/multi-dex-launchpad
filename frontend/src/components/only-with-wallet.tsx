import type {ReactNode} from 'react'
import {useShallow} from 'zustand/shallow'
import {
  type ConnectedWallet,
  useConnectedWalletStore,
} from '@/store/connected-wallet'

type OnlyWithWalletProps = {
  address?: string
  children: (connectedWallet: ConnectedWallet) => ReactNode
}

export const OnlyWithWallet = ({address, children}: OnlyWithWalletProps) => {
  const {connectedWallet} = useConnectedWalletStore(
    useShallow(({connectedWallet}) => ({connectedWallet})),
  )

  if (!connectedWallet) return null
  if (address != null && connectedWallet.address !== address) return null

  return children(connectedWallet)
}
