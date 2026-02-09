import type {LaunchConfig} from '@wingriders/multi-dex-launchpad-common'
import type {ReactNode} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {GridItem} from '@/components/grid-item'

type AllocationProps = {
  config: Pick<
    LaunchConfig,
    'projectToken' | 'totalTokens' | 'tokensToDistribute'
  >
}

export const Allocation = ({
  config: {projectToken, totalTokens, tokensToDistribute},
}: AllocationProps) => {
  return (
    <div className="space-y-2">
      <h2 className="font-bold text-2xl">Tokens allocation</h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <GridItem
          label="Total tokens allocated for this launch"
          value={
            <ValueWrapper>
              <AssetQuantity unit={projectToken} quantity={totalTokens} />
            </ValueWrapper>
          }
        />
        <GridItem
          label="Tokens allocated for participants"
          value={
            <ValueWrapper>
              <AssetQuantity
                unit={projectToken}
                quantity={tokensToDistribute}
              />
            </ValueWrapper>
          }
        />
        <GridItem
          label="Tokens allocated for liquidity pool"
          value={
            <ValueWrapper>
              <AssetQuantity
                unit={projectToken}
                quantity={totalTokens - tokensToDistribute}
              />
            </ValueWrapper>
          }
        />
      </div>
    </div>
  )
}

const ValueWrapper = ({children}: {children: ReactNode}) => {
  return <p className="text-sm">{children}</p>
}
