import {useQuery} from '@tanstack/react-query'
import {
  DEFAULT_TX_VALIDITY_START_BACKDATE_MS,
  type LaunchConfig,
  launchpadConstants,
} from '@wingriders/multi-dex-launchpad-common'
import {useMemo, useState} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {formatDateTime} from '@/helpers/format'
import {useUpdatedTime} from '@/helpers/time'
import type {ConnectedWallet} from '@/store/connected-wallet'
import {useTRPC} from '@/trpc/client'
import {RemoveCommitmentDialog} from './remove-commitment-dialog'
import type {Node} from './types'

type UserNodesProps = {
  launchTxHash: string
  config: Pick<LaunchConfig, 'raisingToken' | 'endTime'>
  connectedWallet: ConnectedWallet
}

export const UserNodes = ({
  launchTxHash,
  config,
  connectedWallet,
}: UserNodesProps) => {
  const trpc = useTRPC()

  const {data, isLoading, error} = useQuery(
    trpc.userNodes.queryOptions({
      launchTxHash,
      ownerPubKeyHash: connectedWallet.pubKeyHash,
    }),
  )

  const [withdrawingNode, setWithdrawingNode] = useState<Node | null>(null)

  return (
    <>
      <div className="space-y-2">
        <h2 className="font-bold text-2xl">Your contributions</h2>

        {data ? (
          data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You haven't contributed to this launch.
            </p>
          ) : (
            <div className="space-y-2">
              {data.map((node) => (
                <NodeItem
                  key={`${node.txHash}-${node.outputIndex}`}
                  node={node}
                  config={config}
                  onWithdraw={() => setWithdrawingNode(node)}
                />
              ))}
            </div>
          )
        ) : isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <ErrorAlert
            title="Failed to fetch your contributions"
            description={error.message}
          />
        ) : null}
      </div>

      <RemoveCommitmentDialog
        launchTxHash={launchTxHash}
        config={config}
        node={withdrawingNode}
        connectedWallet={connectedWallet}
        onClose={() => setWithdrawingNode(null)}
      />
    </>
  )
}

type NodeItemProps = {
  config: Pick<LaunchConfig, 'raisingToken' | 'endTime'>
  node: Node
  onWithdraw: () => void
}

const NodeItem = ({node, config, onWithdraw}: NodeItemProps) => {
  // validityStart of the remove tx must be after (createdTime.getTime() + launchpadConstants.nodesInactivityPeriod)
  // but validityStart is backdated by DEFAULT_TX_VALIDITY_START_BACKDATE_MS
  const canCreateRemoveTxAfter =
    node.createdTime.getTime() +
    launchpadConstants.nodesInactivityPeriod +
    DEFAULT_TX_VALIDITY_START_BACKDATE_MS

  const time = useUpdatedTime(
    useMemo(
      () => [canCreateRemoveTxAfter, config.endTime],
      [canCreateRemoveTxAfter, config.endTime],
    ),
  )

  const canBeRemoved = time > canCreateRemoveTxAfter

  return (
    <div className="flex items-center justify-between rounded-md bg-gray-800 p-4">
      <div className="space-y-1">
        <div className="flex flex-row items-center gap-3">
          <p className="font-bold text-md">
            <AssetQuantity
              unit={config.raisingToken}
              quantity={node.committed}
            />
          </p>
          {node.overCommitted > 0n && (
            <Tooltip>
              <TooltipTrigger>
                <p className="text-xs text-yellow-500">
                  (
                  {node.overCommitted !== node.committed && (
                    <>
                      <AssetQuantity
                        unit={config.raisingToken}
                        quantity={node.overCommitted}
                      />{' '}
                    </>
                  )}
                  after max value was raised)
                </p>
              </TooltipTrigger>

              <TooltipContent className="whitespace-pre-line">
                {node.overCommitted === node.committed
                  ? 'This contribution was created after launch reached its maximum amount to raise.'
                  : 'Part of this contribution was created after launch reached its maximum amount to raise.'}

                {time < config.endTime &&
                  (node.overCommitted === node.committed
                    ? '\nYou will receive your contribution back unless someone who created a contribution before you withdraws from the launch.'
                    : '\nYou will receive that part of your contribution back unless someone who created a contribution before you withdraws from the launch.')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {formatDateTime(node.createdTime, {showSeconds: true})}
        </p>
      </div>

      {canCreateRemoveTxAfter < config.endTime && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant="outline"
                onClick={onWithdraw}
                disabled={!canBeRemoved}
              >
                Withdraw
              </Button>
            </div>
          </TooltipTrigger>
          {!canBeRemoved && (
            <TooltipContent>
              You can withdraw this contribution after{' '}
              {formatDateTime(canCreateRemoveTxAfter, {showSeconds: true})}
            </TooltipContent>
          )}
        </Tooltip>
      )}
    </div>
  )
}
