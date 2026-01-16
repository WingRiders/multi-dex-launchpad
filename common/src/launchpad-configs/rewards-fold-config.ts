import {mConStr0, parseAssetUnit} from '@meshsdk/common'
import type {Quantity, TxInput, Unit} from '@meshsdk/core'
import {bech32AddressToMeshData, txInputToMeshData} from '../helpers/mesh-data'

export type RewardsFoldConfig = {
  starter: TxInput
  ownerBech32Address: string
  nodeSymbol: string
  rewardsFoldPolicy: string
  rewardsHolderValidatorHash: string
  finalProjectTokensHolderValidatorHash: string
  firstProjectTokensHolderValidatorHash: string
  projectTokensHolderPolicy: string
  projectToken: Unit
  raisingToken: Unit
  // Policy ID of the presale tier token
  presaleTierCs: string
  tokensToDistribute: Quantity
  withdrawalEndTime: number // POSIXTime
  oilAda: Quantity
  commitFoldFeeAda: Quantity
  // if 0, only sundae pool is created
  // if 10_000, only wr pool is created
  // if 0 < splitBps < 10_000, splitBps determines what goes to Wr, the rest goes to Sundae
  // NOTE: we don't ensure it's in the [0, 10_000] in the contracts, it's left to off-chain config creation
  splitBps: number
  daoFeeNumerator: number
  daoFeeDenominator: number
  daoFeeReceiverBech32Address: string
  raisedTokensPoolPartPercentage: number
  collateral: Quantity
}

export const rewardsFoldConfigToMeshData = (config: RewardsFoldConfig) => {
  const projectToken = parseAssetUnit(config.projectToken)
  const raisingToken = parseAssetUnit(config.raisingToken)
  return mConStr0([
    txInputToMeshData(config.starter),
    bech32AddressToMeshData(config.ownerBech32Address),
    config.nodeSymbol,
    config.rewardsFoldPolicy,
    config.rewardsHolderValidatorHash,
    config.finalProjectTokensHolderValidatorHash,
    config.firstProjectTokensHolderValidatorHash,
    config.projectTokensHolderPolicy,
    projectToken.policyId,
    projectToken.assetName,
    raisingToken.policyId,
    raisingToken.assetName,
    config.presaleTierCs,
    BigInt(config.tokensToDistribute),
    config.withdrawalEndTime,
    BigInt(config.oilAda),
    BigInt(config.commitFoldFeeAda),
    config.splitBps,
    config.daoFeeNumerator,
    config.daoFeeDenominator,
    bech32AddressToMeshData(config.daoFeeReceiverBech32Address),
    config.raisedTokensPoolPartPercentage,
    BigInt(config.collateral),
  ])
}
