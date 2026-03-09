import {
  type LaunchConfig,
  SPLIT_BPS_BASE,
} from '@wingriders/multi-dex-launchpad-common'
import {round} from 'es-toolkit'
import {CoinsIcon, SparklesIcon, WavesIcon} from 'lucide-react'
import type {ReactNode} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {Card, CardContent, CardHeader} from '@/components/ui/card'
import {cn} from '@/lib/utils'

type AllocationProps = {
  config: Pick<
    LaunchConfig,
    'projectToken' | 'totalTokens' | 'tokensToDistribute' | 'splitBps'
  >
}

export const Allocation = ({
  config: {projectToken, totalTokens, tokensToDistribute, splitBps},
}: AllocationProps) => {
  const tokensForParticipantsPercentage =
    (Number(tokensToDistribute) / Number(totalTokens)) * 100

  const tokensToPools = totalTokens - tokensToDistribute
  const tokensForPoolsPercentage =
    (Number(tokensToPools) / Number(totalTokens)) * 100

  return (
    <section>
      <h2 className="font-bold text-2xl tracking-tight">Tokens allocation</h2>

      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <CardItem
          title="Total tokens allocated"
          icon={<CoinsIcon className="size-5 text-chart-1" />}
          iconClassName="bg-chart-1/20"
          content={<AssetQuantity unit={projectToken} quantity={totalTokens} />}
          className="from-chart-1/10 via-chart-1/5 to-transparent"
        />

        <CardItem
          title="For participants"
          icon={<SparklesIcon className="size-5 text-chart-4" />}
          iconClassName="bg-chart-4/20"
          content={
            <AssetQuantity unit={projectToken} quantity={tokensToDistribute} />
          }
          className="from-chart-4/10 via-chart-4/5 to-transparent"
          additionalContent={`${round(tokensForParticipantsPercentage, 2)}% of total`}
        />

        <CardItem
          title="For liquidity pool"
          icon={<WavesIcon className="size-5 text-chart-3" />}
          iconClassName="bg-chart-3/20"
          content={
            <AssetQuantity unit={projectToken} quantity={tokensToPools} />
          }
          className="from-chart-3/10 via-chart-3/5 to-transparent"
          additionalContent={`${round(tokensForPoolsPercentage, 2)}% of total`}
          footer={<PoolsAllocationBreakdown splitBps={splitBps} />}
        />
      </div>

      <div className="mt-2 rounded-xl border bg-card/50 p-4">
        <p className="font-medium text-muted-foreground text-sm">
          Allocation breakdown
        </p>

        <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-muted/50">
          <div
            className="bg-chart-4 transition-all duration-500"
            style={{width: `${tokensForParticipantsPercentage}%`}}
          />
          <div
            className="bg-chart-3 transition-all duration-500"
            style={{width: `${tokensForPoolsPercentage}%`}}
          />
        </div>

        <div className="mt-3 flex gap-6">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-chart-4" />
            <span className="text-sm">Participants</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-chart-3" />
            <span className="text-sm">Liquidity</span>
          </div>
        </div>
      </div>
    </section>
  )
}

type CardItemProps = {
  title: string
  icon: ReactNode
  iconClassName?: string
  content: ReactNode
  additionalContent?: ReactNode
  footer?: ReactNode
  className?: string
}

const CardItem = ({
  title,
  icon,
  iconClassName,
  content,
  additionalContent,
  footer,
  className,
}: CardItemProps) => {
  return (
    <Card
      className={cn(
        'overflow-hidden border-0 bg-linear-to-br shadow-sm',
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2.5', iconClassName)}>{icon}</div>
          <span className="font-medium text-muted-foreground text-sm">
            {title}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-xl tabular-nums">{content}</p>
        {additionalContent && (
          <p className="mt-1 text-muted-foreground text-sm">
            {additionalContent}
          </p>
        )}
        {footer}
      </CardContent>
    </Card>
  )
}

type PoolsAllocationBreakdownProps = {
  splitBps: number
}

const PoolsAllocationBreakdown = ({
  splitBps,
}: PoolsAllocationBreakdownProps) => {
  const wrPoolPercentage =
    splitBps === 0 ? undefined : (splitBps / SPLIT_BPS_BASE) * 100
  const sundaePoolPercentage =
    splitBps === SPLIT_BPS_BASE
      ? undefined
      : ((SPLIT_BPS_BASE - splitBps) / SPLIT_BPS_BASE) * 100

  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted/50">
        {wrPoolPercentage != null && (
          <div className="bg-chart-1" style={{width: `${wrPoolPercentage}%`}} />
        )}
        {sundaePoolPercentage != null && (
          <div
            className="bg-chart-2"
            style={{width: `${sundaePoolPercentage}%`}}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {wrPoolPercentage != null && (
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-chart-1" />
            <span className="text-muted-foreground text-xs">
              {round(wrPoolPercentage, 1)}% WingRiders V2 pool
            </span>
          </div>
        )}
        {sundaePoolPercentage != null && (
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-chart-2" />
            <span className="text-muted-foreground text-xs">
              {round(sundaePoolPercentage, 1)}% SundaeSwap V3 pool
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
