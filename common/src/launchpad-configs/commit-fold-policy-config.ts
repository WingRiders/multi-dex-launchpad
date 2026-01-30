import {mConStr0, type TxInput} from '@meshsdk/common'
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
