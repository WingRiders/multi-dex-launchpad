import {mConStr0} from '@meshsdk/common'
import type {TxInput} from '@meshsdk/core'
import {bech32AddressToMeshData, txInputToMeshData} from '@/helpers'

export type TokensHolderFirstConfig = {
  ownerBech32Address: string
  startTime: number // POSIXTime
  projectTokensHolderSymbol: string
  starter: TxInput
  withdrawalEndTime: number // POSIXTime
  daoAdminPubKeyHash: string // PubKeyHash
}

export const tokensHolderFirstConfigToMeshData = (
  config: TokensHolderFirstConfig,
) =>
  mConStr0([
    bech32AddressToMeshData(config.ownerBech32Address),
    config.startTime,
    config.projectTokensHolderSymbol,
    txInputToMeshData(config.starter),
    config.withdrawalEndTime,
    config.daoAdminPubKeyHash,
  ])
