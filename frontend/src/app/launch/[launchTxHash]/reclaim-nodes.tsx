import type {LaunchConfig} from '@wingriders/multi-dex-launchpad-common'
import {useMemo, useState} from 'react'
import {Button} from '@/components/ui/button'
import type {ConnectedWallet} from '@/store/connected-wallet'
import {ReclaimNodesDialog} from './reclaim-nodes-dialog'
import type {Node} from './types'

type ReclaimNodesProps = {
  connectedWallet: ConnectedWallet
  launchTxHash: string
  config: Pick<LaunchConfig, 'raisingToken'>
  nodes: Node[]
}

export const ReclaimNodes = ({
  connectedWallet,
  launchTxHash,
  config,
  nodes,
}: ReclaimNodesProps) => {
  const unspentNodes = useMemo(
    () => nodes.filter((node) => !node.isSpent),
    [nodes],
  )

  const [isReclaimNodesDialogOpen, setIsReclaimNodesDialogOpen] =
    useState(false)

  return (
    <>
      <div className="flex flex-row items-center justify-between gap-4">
        <p className="text-muted-foreground">
          {unspentNodes.length > 0
            ? 'Launch failed to meet the required minimum value to raise, you can reclaim your contributions.'
            : 'Launch failed to meet the required minimum value to raise, you have reclaimed all your contributions.'}
        </p>

        {unspentNodes.length > 0 && (
          <Button onClick={() => setIsReclaimNodesDialogOpen(true)}>
            Reclaim contributions
          </Button>
        )}
      </div>

      {unspentNodes.length > 0 && (
        <ReclaimNodesDialog
          open={isReclaimNodesDialogOpen}
          onOpenChange={setIsReclaimNodesDialogOpen}
          connectedWallet={connectedWallet}
          launchTxHash={launchTxHash}
          config={config}
          unspentNodes={unspentNodes}
        />
      )}
    </>
  )
}
