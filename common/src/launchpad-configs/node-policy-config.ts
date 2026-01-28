import {mConStr0} from '@meshsdk/common'
import type {TxInput} from '@meshsdk/core'
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
