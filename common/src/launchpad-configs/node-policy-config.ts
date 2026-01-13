import {mConStr0} from '@meshsdk/common'
import type {Quantity, TxInput} from '@meshsdk/core'
import {txInputToMeshData} from '@/helpers'

export type NodePolicyConfig = {
  starter: TxInput
  ownerPubKeyHash: string
  nodeAda: Quantity
}

export const nodePolicyConfigToMeshData = (config: NodePolicyConfig): any =>
  mConStr0([
    txInputToMeshData(config.starter),
    config.ownerPubKeyHash,
    BigInt(config.nodeAda),
  ])
