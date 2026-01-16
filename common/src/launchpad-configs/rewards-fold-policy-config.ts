import type {Data, TxInput} from '@meshsdk/core'
import {txInputToMeshData} from '../helpers/mesh-data'

export type RewardsFoldPolicyConfig = {
  starter: TxInput
}

export const rewardsFoldPolicyConfigToMeshData = (
  config: RewardsFoldPolicyConfig,
): Data => txInputToMeshData(config.starter)
