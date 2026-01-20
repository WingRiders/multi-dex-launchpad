import {mConStr0, type TxInput} from '@meshsdk/common'
import {txInputToMeshData} from '../helpers/mesh-data'

export type CommitFoldConfig = {
  starter: TxInput
  commitFoldSymbol: string
  nodeSymbol: string
  withdrawalEndTime: number // POSIXTime
  daoAdminPubKeyHash: string
}

export const commitFoldConfigToMeshData = (config: CommitFoldConfig) =>
  mConStr0([
    txInputToMeshData(config.starter),
    config.commitFoldSymbol,
    config.nodeSymbol,
    config.withdrawalEndTime,
    config.daoAdminPubKeyHash,
  ])
