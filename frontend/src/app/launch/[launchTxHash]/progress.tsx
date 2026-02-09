import {
  type LaunchConfig,
  MAX_INT64,
} from '@wingriders/multi-dex-launchpad-common'
import type {ReactNode} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {GridItem} from '@/components/grid-item'

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
  return (
    <div className="space-y-2">
      <h2 className="font-bold text-2xl">Progress</h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <GridItem
          label="Total raised"
          value={
            <ValueWrapper>
              <AssetQuantity unit={raisingToken} quantity={totalCommitted} />
            </ValueWrapper>
          }
        />
        <GridItem
          label="Raised tokens to pool"
          value={<ValueWrapper>{raisedTokensPoolPartPercentage}%</ValueWrapper>}
          tooltip="Percentage of raised tokens that will be used to create the liquidity pool after the launch ends."
        />
        <GridItem
          label="Minimum amount to raise"
          value={
            <ValueWrapper>
              <AssetQuantity
                unit={raisingToken}
                quantity={projectMinCommitment}
              />
            </ValueWrapper>
          }
          tooltip="Minimum amount of funds to raise. Launch will fails if it doesn't reach this target."
        />
        <GridItem
          label="Maximum amount to raise"
          value={
            <ValueWrapper>
              {projectMaxCommitment === MAX_INT64 ? (
                <span className="text-muted-foreground italic">not set</span>
              ) : (
                <AssetQuantity
                  unit={raisingToken}
                  quantity={projectMaxCommitment}
                />
              )}
            </ValueWrapper>
          }
          tooltip="Maximum amount of funds to raise. Launch will return all funds raised above this amount."
        />
      </div>
    </div>
  )
}

const ValueWrapper = ({children}: {children: ReactNode}) => {
  return <p className="text-sm">{children}</p>
}
