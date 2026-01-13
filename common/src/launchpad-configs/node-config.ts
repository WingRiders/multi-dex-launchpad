import {mConStr0, parseAssetUnit} from '@meshsdk/common'
import type {Quantity, TxInput, Unit} from '@meshsdk/core'
import {bech32AddressToMeshData, txInputToMeshData} from '@/helpers'

export type NodeConfig = {
  starter: TxInput
  nodeSymbol: string
  rewardsFoldSymbol: string
  rewardsFoldValidatorHash: string
  commitFoldSymbol: string
  commitFoldValidatorHash: string
  tokensHolderSymbol: string
  tokensHolderValidatorHash: string
  failProofSymbol: string
  failProofValidatorHash: string
  // Policy ID of the presale tier token
  presaleTierCs: string
  presaleTierMinCommitment: Quantity
  presaleTierMaxCommitment: Quantity
  presaleTierStartTime: number // POSIXTime
  defaultTierMinCommitment: Quantity
  defaultTierMaxCommitment: Quantity
  defaultStartTime: number // POSIXTime
  startTime: number // POSIXTime
  contributionEndTime: number // POSIXTime
  withdrawalEndTime: number // POSIXTime
  projectMinCommitment: Quantity
  projectMaxCommitment: Quantity
  totalTokens: Quantity
  projectToken: Unit
  raisingToken: Unit
  ownerBech32Address: string
  daoAdminPubKeyHash: string
  daoFeeReceiverBech32Address: string
  collateral: Quantity
  nodeAda: Quantity
  oilAda: Quantity
  commitFoldFeeAda: Quantity
}

export const nodeConfigToMeshData = (config: NodeConfig) => {
  const projectToken = parseAssetUnit(config.projectToken)
  const raisingToken = parseAssetUnit(config.raisingToken)
  return mConStr0([
    txInputToMeshData(config.starter),
    config.nodeSymbol,
    config.rewardsFoldSymbol,
    config.rewardsFoldValidatorHash,
    config.commitFoldSymbol,
    config.commitFoldValidatorHash,
    config.tokensHolderSymbol,
    config.tokensHolderValidatorHash,
    config.failProofSymbol,
    config.failProofValidatorHash,
    config.presaleTierCs,
    BigInt(config.presaleTierMinCommitment),
    BigInt(config.presaleTierMaxCommitment),
    config.presaleTierStartTime,
    BigInt(config.defaultTierMinCommitment),
    BigInt(config.defaultTierMaxCommitment),
    config.defaultStartTime,
    config.startTime,
    config.contributionEndTime,
    config.withdrawalEndTime,
    BigInt(config.projectMinCommitment),
    BigInt(config.projectMaxCommitment),
    BigInt(config.totalTokens),
    projectToken.policyId,
    projectToken.assetName,
    raisingToken.policyId,
    raisingToken.assetName,
    bech32AddressToMeshData(config.ownerBech32Address),
    config.daoAdminPubKeyHash,
    bech32AddressToMeshData(config.daoFeeReceiverBech32Address),
    BigInt(config.collateral),
    BigInt(config.nodeAda),
    BigInt(config.oilAda),
    BigInt(config.commitFoldFeeAda),
  ])
}
