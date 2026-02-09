import {mConStr0, type TxInput} from '@meshsdk/common'
import type {Unit} from '@meshsdk/core'
import {parseUnit} from '../helpers'
import {bech32AddressToMeshData, txInputToMeshData} from '../helpers/mesh-data'

export type NodeConfig = {
  starter: TxInput
  nodeSymbol: string
  rewardsFoldSymbol: string
  rewardsFoldValidatorHash: string
  commitFoldSymbol: string
  commitFoldValidatorHash: string
  tokensHolderSymbol: string
  tokensHolderFirstValidatorHash: string
  failProofSymbol: string
  failProofValidatorHash: string
  // Policy ID of the presale tier token
  presaleTierCs: string
  presaleTierMinCommitment: bigint
  presaleTierMaxCommitment: bigint
  presaleTierStartTime: number // POSIXTime
  defaultTierMinCommitment: bigint
  defaultTierMaxCommitment: bigint
  defaultStartTime: number // POSIXTime
  startTime: number // POSIXTime
  endTime: number // POSIXTime
  projectMinCommitment: bigint
  projectMaxCommitment: bigint
  totalTokens: bigint
  projectToken: Unit
  raisingToken: Unit
  ownerBech32Address: string
  daoAdminPubKeyHash: string
  daoFeeReceiverBech32Address: string
  collateral: bigint
  nodeAda: bigint
  oilAda: bigint
  commitFoldFeeAda: bigint
}

export const nodeConfigToMeshData = (config: NodeConfig) => {
  const [projectTokenPolicyId, projectTokenAssetName] = parseUnit(
    config.projectToken,
  )
  const [raisingTokenPolicyId, raisingTokenAssetName] = parseUnit(
    config.raisingToken,
  )

  return mConStr0([
    txInputToMeshData(config.starter),
    config.nodeSymbol,
    config.rewardsFoldSymbol,
    config.rewardsFoldValidatorHash,
    config.commitFoldSymbol,
    config.commitFoldValidatorHash,
    config.tokensHolderSymbol,
    config.tokensHolderFirstValidatorHash,
    config.failProofSymbol,
    config.failProofValidatorHash,
    config.presaleTierCs,
    config.presaleTierMinCommitment,
    config.presaleTierMaxCommitment,
    config.presaleTierStartTime,
    config.defaultTierMinCommitment,
    config.defaultTierMaxCommitment,
    config.defaultStartTime,
    config.startTime,
    config.endTime,
    config.projectMinCommitment,
    config.projectMaxCommitment,
    config.totalTokens,
    projectTokenPolicyId,
    projectTokenAssetName,
    raisingTokenPolicyId,
    raisingTokenAssetName,
    bech32AddressToMeshData(config.ownerBech32Address),
    config.daoAdminPubKeyHash,
    bech32AddressToMeshData(config.daoFeeReceiverBech32Address),
    config.collateral,
    config.nodeAda,
    config.oilAda,
    config.commitFoldFeeAda,
  ])
}
