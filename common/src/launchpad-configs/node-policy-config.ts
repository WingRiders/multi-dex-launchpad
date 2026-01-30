import {mConStr0, type TxInput} from '@meshsdk/common'
import {txInputToMeshData} from '../helpers/mesh-data'

export type NodePolicyConfig = {
  starter: TxInput
  ownerPubKeyHash: string
  nodeAda: bigint
}

export const nodePolicyConfigToMeshData = (config: NodePolicyConfig): any =>
  mConStr0([
    txInputToMeshData(config.starter),
    config.ownerPubKeyHash,
    config.nodeAda,
  ])
