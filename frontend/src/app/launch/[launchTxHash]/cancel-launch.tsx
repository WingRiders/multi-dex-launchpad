import type {LaunchConfig} from '@wingriders/multi-dex-launchpad-common'
import {useMemo, useState} from 'react'
import {Button} from '@/components/ui/button'
import {useUpdatedTime} from '@/helpers/time'
import type {ConnectedWallet} from '@/store/connected-wallet'
import {CancelLaunchDialog} from './cancel-launch-dialog'

type CancelLaunchProps = {
  launchTxHash: string
  config: Pick<LaunchConfig, 'ownerBech32Address' | 'startTime'>
  connectedWallet: ConnectedWallet
}

export const CancelLaunch = ({
  launchTxHash,
  config,
  connectedWallet,
}: CancelLaunchProps) => {
  const time = useUpdatedTime(
    useMemo(() => [config.startTime], [config.startTime]),
  )

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (time > config.startTime) return null

  return (
    <>
      <div className="flex items-center justify-between space-y-2 rounded-md border border-destructive p-4">
        <div className="space-y-1">
          <h2 className="font-bold text-2xl text-destructive">Cancel launch</h2>
          <p className="text-muted-foreground text-sm">
            You can cancel this launch before it starts.
          </p>
        </div>

        <Button variant="destructive" onClick={() => setIsDialogOpen(true)}>
          Cancel launch
        </Button>
      </div>

      <CancelLaunchDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        launchTxHash={launchTxHash}
        config={config}
        connectedWallet={connectedWallet}
      />
    </>
  )
}
