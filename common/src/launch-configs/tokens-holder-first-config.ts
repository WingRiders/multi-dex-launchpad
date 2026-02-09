import {mConStr0, type TxInput} from '@meshsdk/common'
import {bech32AddressToMeshData, txInputToMeshData} from '../helpers/mesh-data'

export type TokensHolderFirstConfig = {
  ownerBech32Address: string
  startTime: number // POSIXTime
  projectTokensHolderSymbol: string
  starter: TxInput
  endTime: number // POSIXTime
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
    config.endTime,
    config.daoAdminPubKeyHash,
  ])
