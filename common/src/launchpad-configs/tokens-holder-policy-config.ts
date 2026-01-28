import {mConStr0, parseAssetUnit} from '@meshsdk/common'
import type {TxInput, Unit} from '@meshsdk/core'
import {txInputToMeshData} from '../helpers/mesh-data'

export type TokensHolderPolicyConfig = {
  // PubKeyHash
  owner: string

  // POSIXTime
  startTime: number

  totalTokens: bigint

  projectToken: Unit

  // Must be at least 2 ada per used DEX plus 2 ada for the dao fee utxo
  // The rest is returned if the launch is successful.
  // If the launch is failed (not cancelled), the collateral is split between the commit fold owner and the dao fee receiver
  collateral: bigint

  starter: TxInput

  // PolicyId
  nodeSymbol: string
}

export const tokensHolderPolicyConfigToMeshData = (
  config: TokensHolderPolicyConfig,
) => {
  const projectToken = parseAssetUnit(config.projectToken)
  return mConStr0([
    config.owner,
    config.startTime,
    config.totalTokens,
    projectToken.policyId,
    projectToken.assetName,
    config.collateral,
    txInputToMeshData(config.starter),
    config.nodeSymbol,
  ])
}
