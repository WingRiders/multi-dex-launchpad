import {useQuery} from '@tanstack/react-query'
import type {LaunchConfig} from '@wingriders/multi-dex-launchpad-common'
import BigNumber from 'bignumber.js'
import {CheckIcon, TriangleAlertIcon} from 'lucide-react'
import {useMemo, useState} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {useUpdatedTime} from '@/helpers/time'
import type {ConnectedWallet} from '@/store/connected-wallet'
import {useTRPC} from '@/trpc/client'
import {ClaimRewardsDialog} from './claim-rewards-dialog'
import type {Node, RewardsHolder} from './types'

type UserRewardsProps = {
  launchTxHash: string
  config: Pick<
    LaunchConfig,
    | 'raisingToken'
    | 'endTime'
    | 'projectMinCommitment'
    | 'tokensToDistribute'
    | 'projectToken'
  >
  connectedWallet: ConnectedWallet
  totalCommitted: bigint
  userNodes: Node[]
}

export const UserRewards = ({
  launchTxHash,
  config,
  connectedWallet,
  totalCommitted,
  userNodes,
}: UserRewardsProps) => {
  const time = useUpdatedTime(useMemo(() => [config.endTime], [config.endTime]))

  return (
    <>
      {time < config.endTime ? (
        <EstimatedRewards
          totalCommitted={totalCommitted}
          config={config}
          userNodes={userNodes}
        />
      ) : (
        <RewardsAfterLaunchEnd
          launchTxHash={launchTxHash}
          connectedWallet={connectedWallet}
          totalCommitted={totalCommitted}
          config={config}
          userNodes={userNodes}
        />
      )}
    </>
  )
}

type EstimatedRewardsProps = {
  totalCommitted: bigint
  config: Pick<
    LaunchConfig,
    | 'raisingToken'
    | 'endTime'
    | 'projectMinCommitment'
    | 'tokensToDistribute'
    | 'projectToken'
  >
  userNodes: Node[]
}

const EstimatedRewards = ({
  totalCommitted,
  config,
  userNodes,
}: EstimatedRewardsProps) => {
  const userCommitted = useMemo(
    () => userNodes.reduce((acc, node) => acc + node.committed, 0n),
    [userNodes],
  )

  const estimatedRewards = useMemo(() => {
    if (totalCommitted === 0n) return 0n
    return BigInt(
      new BigNumber(userCommitted)
        .div(new BigNumber(totalCommitted))
        .times(new BigNumber(config.tokensToDistribute))
        .integerValue()
        .toString(),
    )
  }, [userCommitted, totalCommitted, config.tokensToDistribute])

  const reachedMinCommitment = totalCommitted >= config.projectMinCommitment

  return (
    <div className="flex flex-row items-center gap-2 text-muted-foreground text-sm">
      <p>
        Estimated rewards:{' '}
        <AssetQuantity unit={config.projectToken} quantity={estimatedRewards} />
      </p>

      {!reachedMinCommitment && (
        <Tooltip>
          <TooltipTrigger>
            <TriangleAlertIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>
            The launch has not reach the minimum amount to raise yet.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

type RewardsAfterLaunchEndProps = {
  launchTxHash: string
  connectedWallet: ConnectedWallet
  totalCommitted: bigint
  config: Pick<
    LaunchConfig,
    | 'raisingToken'
    | 'endTime'
    | 'projectMinCommitment'
    | 'tokensToDistribute'
    | 'projectToken'
  >
  userNodes: Node[]
}

const RewardsAfterLaunchEnd = ({
  launchTxHash,
  connectedWallet,
  totalCommitted,
  config,
  userNodes,
}: RewardsAfterLaunchEndProps) => {
  const trpc = useTRPC()

  const {
    data: rewardsHolders,
    isLoading: isLoadingRewardsHolders,
    error: rewardsHoldersError,
  } = useQuery(
    trpc.userRewardsHolders.queryOptions({
      launchTxHash,
      ownerPubKeyHash: connectedWallet.pubKeyHash,
    }),
  )

  if (rewardsHoldersError) {
    return (
      <ErrorAlert
        title="Error while fetching rewards"
        description={rewardsHoldersError.message}
      />
    )
  }

  if (isLoadingRewardsHolders) {
    return <Skeleton className="h-12 w-full" />
  }

  // if the launch ended and the user doesn't have all rewards holder yet, we show the estimated rewards
  if (!rewardsHolders || rewardsHolders.length !== userNodes.length)
    return (
      <div className="flex flex-row items-center justify-between gap-2">
        <EstimatedRewards
          totalCommitted={totalCommitted}
          config={config}
          userNodes={userNodes}
        />

        <p className="text-sm">
          Launch ended, waiting for rewards to be distributed
        </p>
      </div>
    )

  const receivedRewards = rewardsHolders.reduce(
    (acc, holder) => acc + holder.rewards,
    0n,
  )

  return (
    <div className="flex flex-row items-center justify-between gap-2">
      <p className="text-muted-foreground text-sm">
        Received rewards:{' '}
        <AssetQuantity unit={config.projectToken} quantity={receivedRewards} />
      </p>

      <ClaimButton
        launchTxHash={launchTxHash}
        config={config}
        rewardsHolders={rewardsHolders}
        connectedWallet={connectedWallet}
      />
    </div>
  )
}

type ClaimButtonProps = {
  launchTxHash: string
  config: Pick<LaunchConfig, 'projectToken'>
  rewardsHolders: RewardsHolder[]
  connectedWallet: ConnectedWallet
}

const ClaimButton = ({
  launchTxHash,
  config,
  rewardsHolders,
  connectedWallet,
}: ClaimButtonProps) => {
  const unspentRewardsHolders = useMemo(
    () => rewardsHolders.filter((h) => !h.isSpent),
    [rewardsHolders],
  )

  const hasUnspentRewardsHolders = unspentRewardsHolders.length > 0

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (!hasUnspentRewardsHolders)
    return (
      <Button disabled>
        Claimed <CheckIcon className="size-4" />
      </Button>
    )

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>Claim rewards</Button>

      <ClaimRewardsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        launchTxHash={launchTxHash}
        config={config}
        unspentRewardsHolders={unspentRewardsHolders}
        connectedWallet={connectedWallet}
      />
    </>
  )
}
