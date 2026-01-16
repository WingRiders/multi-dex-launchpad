import {mConStr0} from '@meshsdk/common'
import type {TxInput} from '@meshsdk/core'
import {txInputToMeshData} from '../helpers/mesh-data'

export type CommitFoldPolicyConfig = {
  starter: TxInput
  contributionEndTime: number // POSIXTime
  withdrawalEndTime: number // POSIXTime
  nodeSymbol: string
}

export const commitFoldPolicyConfigToMeshData = (
  config: CommitFoldPolicyConfig,
) =>
  mConStr0([
    txInputToMeshData(config.starter),
    config.contributionEndTime,
    config.withdrawalEndTime,
    config.nodeSymbol,
  ])
