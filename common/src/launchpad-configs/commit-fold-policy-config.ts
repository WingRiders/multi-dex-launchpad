import {mConStr0} from '@meshsdk/common'
import type {TxInput} from '@meshsdk/core'
import {txInputToMeshData} from '../helpers/mesh-data'

export type CommitFoldPolicyConfig = {
  starter: TxInput
  endTime: number // POSIXTime
  nodeSymbol: string
}

export const commitFoldPolicyConfigToMeshData = (
  config: CommitFoldPolicyConfig,
) =>
  mConStr0([
    txInputToMeshData(config.starter),
    config.endTime,
    config.nodeSymbol,
  ])
