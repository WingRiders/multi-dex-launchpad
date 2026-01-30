import type {TxInput} from '@meshsdk/common'
import type {Data} from '@meshsdk/core'
import {txInputToMeshData} from '../helpers/mesh-data'

export type RewardsFoldPolicyConfig = {
  starter: TxInput
}

export const rewardsFoldPolicyConfigToMeshData = (
  config: RewardsFoldPolicyConfig,
): Data => txInputToMeshData(config.starter)
