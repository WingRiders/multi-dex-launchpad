import {mConStr0, parseAssetUnit, type TxInput} from '@meshsdk/common'
import type {Unit} from '@meshsdk/core'
import {bech32AddressToMeshData, txInputToMeshData} from '../helpers/mesh-data'

export type TokensHolderFinalConfig = {
  ownerBech32Address: string
  wrPoolSymbol: string
  wrPoolValidatorHash: string
  wrFactoryValidatorHash: string
  sundaePoolScriptHash: string
  sundaeFeeTolerance: bigint
  sundaeSettingsCurrencySymbol: string
  poolProofValidatorHash: string
  vestingValidatorHash: string
  vestingPeriodDuration: bigint // POSIXTime
  vestingPeriodDurationToFirstUnlock: bigint // POSIXTime
  vestingPeriodInstallments: bigint
  vestingPeriodStart: number // POSIXTime
  daoFeeReceiverBech32Address: string
  raisingToken: Unit
  projectToken: Unit
  starter: TxInput
}

export const tokensHolderFinalConfigToMeshData = (
  config: TokensHolderFinalConfig,
) => {
  const projectToken = parseAssetUnit(config.projectToken)
  const raisingToken = parseAssetUnit(config.raisingToken)
  return mConStr0([
    bech32AddressToMeshData(config.ownerBech32Address),
    config.wrPoolSymbol,
    config.wrPoolValidatorHash,
    config.wrFactoryValidatorHash,
    config.sundaePoolScriptHash,
    config.sundaeFeeTolerance,
    config.sundaeSettingsCurrencySymbol,
    config.poolProofValidatorHash,
    config.vestingValidatorHash,
    config.vestingPeriodDuration,
    config.vestingPeriodDurationToFirstUnlock,
    config.vestingPeriodInstallments,
    config.vestingPeriodStart,
    bech32AddressToMeshData(config.daoFeeReceiverBech32Address),
    raisingToken.policyId,
    raisingToken.assetName,
    projectToken.policyId,
    projectToken.assetName,
    txInputToMeshData(config.starter),
  ])
}
