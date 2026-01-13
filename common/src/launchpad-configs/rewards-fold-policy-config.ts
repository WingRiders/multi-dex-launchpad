import type {Data, TxInput} from '@meshsdk/core'
import {txInputToMeshData} from '@/helpers'

export type RewardsFoldPolicyConfig = {
  starter: TxInput
}

export const rewardsFoldPolicyConfigToMeshData = (
  config: RewardsFoldPolicyConfig,
): Data => txInputToMeshData(config.starter)
