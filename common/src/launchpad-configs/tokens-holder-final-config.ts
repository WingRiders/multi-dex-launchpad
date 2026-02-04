import {mConStr0, type TxInput} from '@meshsdk/common'
import type {Unit} from '@meshsdk/core'
import {parseUnit} from '../helpers'
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
  const [projectTokenPolicyId, projectTokenAssetName] = parseUnit(
    config.projectToken,
  )
  const [raisingTokenPolicyId, raisingTokenAssetName] = parseUnit(
    config.raisingToken,
  )

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
    raisingTokenPolicyId,
    raisingTokenAssetName,
    projectTokenPolicyId,
    projectTokenAssetName,
    txInputToMeshData(config.starter),
  ])
}
