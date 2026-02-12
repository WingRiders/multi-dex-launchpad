import {
  type LaunchConfig,
  MAX_INT64,
} from '@wingriders/multi-dex-launchpad-common'
import BigNumber from 'bignumber.js'
import type {ReactNode} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {InfoTooltip} from '@/components/info-tooltip'
import {Card, CardContent, CardHeader} from '@/components/ui/card'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'

type ProgressProps = {
  config: Pick<
    LaunchConfig,
    | 'raisingToken'
    | 'raisedTokensPoolPartPercentage'
    | 'projectMinCommitment'
    | 'projectMaxCommitment'
  >
  totalCommitted: bigint
}

export const Progress = ({
  config: {
    raisingToken,
    raisedTokensPoolPartPercentage,
    projectMinCommitment,
    projectMaxCommitment,
  },
  totalCommitted,
}: ProgressProps) => {
  const hasMaxCap = projectMaxCommitment !== MAX_INT64

  const progressPercentage = new BigNumber(totalCommitted)
    .div(hasMaxCap ? projectMaxCommitment : projectMinCommitment)
    .times(100)
    .toNumber()

  const minCommitmentPercentage = new BigNumber(projectMinCommitment)
    .div(projectMaxCommitment)
    .times(100)
    .toNumber()

  return (
    <section>
      <h2 className="font-bold text-2xl tracking-tight">Progress</h2>

      <Card className="mt-4">
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-medium text-muted-foreground text-sm">
              Total raised
            </span>
            <p className="font-bold text-2xl tabular-nums">
              <AssetQuantity unit={raisingToken} quantity={totalCommitted} />
            </p>
          </div>

          <div className="relative">
            <div className="h-6 overflow-hidden rounded-full bg-muted/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalCommitted >= projectMinCommitment
                    ? 'bg-success'
                    : 'bg-chart-1'
                }`}
                style={{width: `${Math.min(progressPercentage, 100)}%`}}
              />
            </div>
            {hasMaxCap && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 h-6 w-0.5 -translate-x-1/2 bg-foreground/40"
                    style={{left: `${minCommitmentPercentage}%`}}
                  />
                </TooltipTrigger>
                <TooltipContent>Minimum target</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="relative mt-1 flex justify-between text-muted-foreground text-xs">
            <span>0</span>
            <span>{hasMaxCap ? 'Max cap' : 'Min target'}</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <CardItem
          title="Minimum target"
          content={
            <>
              <p className="font-semibold text-lg tabular-nums">
                <AssetQuantity
                  unit={raisingToken}
                  quantity={projectMinCommitment}
                />
              </p>
              {totalCommitted >= projectMinCommitment && (
                <p className="mt-1 text-success text-xs">Target reached</p>
              )}
            </>
          }
          tooltip="Minimum amount of funds to raise. Launch will fail if it doesn't reach this target."
        />

        <CardItem
          title="Maximum cap"
          content={
            !hasMaxCap ? (
              <p className="font-semibold text-lg text-muted-foreground italic">
                Not set
              </p>
            ) : (
              <>
                <p className="font-semibold text-lg tabular-nums">
                  <AssetQuantity
                    unit={raisingToken}
                    quantity={projectMaxCommitment}
                  />
                </p>
                {totalCommitted >= projectMaxCommitment && (
                  <p className="mt-1 text-success text-xs">Fully funded</p>
                )}
              </>
            )
          }
          tooltip="Maximum amount of funds to raise. Launch will return all funds raised above this amount."
        />

        <CardItem
          title="Raised to pool"
          content={
            <p className="font-semibold text-lg tabular-nums">
              {raisedTokensPoolPartPercentage}%
            </p>
          }
          tooltip="Percentage of raised tokens that will be used to create the liquidity pool after the launch ends."
        />
      </div>
    </section>
  )
}

type CardItemProps = {
  title: string
  content: ReactNode
  tooltip: string
}

const CardItem = ({title, content, tooltip}: CardItemProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <span className="font-medium text-muted-foreground text-sm">
          {title}
        </span>
        <InfoTooltip content={tooltip} />
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
