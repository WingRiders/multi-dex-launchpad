import {mConStr0} from '@meshsdk/common'
import type {Data} from '@meshsdk/core'

export type RewardsHolderConfig = {
  poolProofValidatorHash: string
  poolProofSymbol: string
}

export const rewardsHolderConfigToMeshData = (
  config: RewardsHolderConfig,
): Data => mConStr0([config.poolProofValidatorHash, config.poolProofSymbol])
