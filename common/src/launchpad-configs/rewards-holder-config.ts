import {mBool, mConStr0} from '@meshsdk/common'
import type {Data} from '@meshsdk/core'

export type RewardsHolderConfig = {
  poolProofValidatorHash: string
  poolProofSymbol: string
  usesWr: boolean
  usesSundae: boolean
  withdrawalEndTime: number // POSIXTime
}

export const rewardsHolderConfigToMeshData = (
  config: RewardsHolderConfig,
): Data =>
  mConStr0([
    config.poolProofValidatorHash,
    config.poolProofSymbol,
    mBool(config.usesWr),
    mBool(config.usesSundae),
    config.withdrawalEndTime,
  ])
