import {mConStr0, parseAssetUnit} from '@meshsdk/common'
import type {Quantity, TxInput, Unit} from '@meshsdk/core'
import {bech32AddressToMeshData, txInputToMeshData} from '@/helpers'

export type TokensHolderFinalConfig = {
  ownerBech32Address: string
  wrPoolSymbol: string
  wrPoolValidatorHash: string
  wrFactoryValidatorHash: string
  sundaePoolScriptHash: string
  sundaeFeeTolerance: Quantity
  sundaeSettingsCurrencySymbol: string
  poolProofValidatorHash: string
  vestingValidatorHash: string
  vestingPeriodDuration: number // POSIXTime
  vestingPeriodDurationToFirstUnlock: number // POSIXTime
  vestingPeriodInstallments: number
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
    BigInt(config.sundaeFeeTolerance),
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
