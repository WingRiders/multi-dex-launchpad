import type {DialogProps} from '@radix-ui/react-dialog'
import {useInstalledWalletsIdsQuery} from '@/wallet/queries'
import {
  type SupportedWalletType,
  supportedWalletsInfo,
  supportedWalletTypes,
} from '@/wallet/supported-wallets'
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '../ui/dialog'
import {WalletItem} from './wallet-item'

type ConnectWalletDialogProps = Pick<DialogProps, 'open' | 'onOpenChange'> & {
  onConnect: (walletType: SupportedWalletType) => void
  isWalletConnecting: boolean
}

export const ConnectWalletDialog = ({
  open,
  onOpenChange,
  onConnect,
  isWalletConnecting,
}: ConnectWalletDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ConnectWalletDialogContent
          onConnect={onConnect}
          isWalletConnecting={isWalletConnecting}
        />
      </DialogContent>
    </Dialog>
  )
}

type ConnectWalletDialogContentProps = {
  onConnect: (walletType: SupportedWalletType) => void
  isWalletConnecting: boolean
}

const ConnectWalletDialogContent = ({
  onConnect,
  isWalletConnecting,
}: ConnectWalletDialogContentProps) => {
  const {data: installedWalletsIds} = useInstalledWalletsIdsQuery()

  return (
    <DialogHeader>
      <DialogTitle>Connect wallet</DialogTitle>

      <div className="mt-3 flex flex-col gap-3">
        {supportedWalletTypes.map((walletType) => {
          const {id, name, icon} = supportedWalletsInfo[walletType]
          return (
            <WalletItem
              key={walletType}
              walletInfo={{id, name, icon}}
              onClick={() => onConnect(walletType as SupportedWalletType)}
              isInstalled={!!installedWalletsIds?.has(id)}
              isWalletConnecting={isWalletConnecting}
            />
          )
        })}
      </div>
    </DialogHeader>
  )
}
