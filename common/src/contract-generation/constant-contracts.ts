import {applyParamsToScriptExport, getScriptFromExport} from '../helpers/script'
import {poolProofConfigToMeshData} from '../launch-configs/pool-proof-config'
import {poolProofPolicyConfigToMeshData} from '../launch-configs/pool-proof-policy-config'
import {rewardsHolderConfigToMeshData} from '../launch-configs/rewards-holder-config'
import * as artifacts from '../on-chain/artifacts'
import type {ConstantContracts} from '../on-chain/types'

type GenerateConstantContractsParams = {
  wrPoolValidatorHash: string
  wrPoolSymbol: string
  sundaePoolScriptHash: string
}

export const generateConstantContracts = (
  params: GenerateConstantContractsParams,
): ConstantContracts => {
  const failProofPolicy = getScriptFromExport(artifacts.failProofPolicy)
  const failProofValidator = getScriptFromExport(artifacts.failProofValidator)
  const poolProofPolicy = applyParamsToScriptExport(
    artifacts.parametricPoolProofPolicy,
    [poolProofPolicyConfigToMeshData(params)],
  )
  const poolProofValidator = applyParamsToScriptExport(
    artifacts.parametricPoolProofValidator,
    [poolProofConfigToMeshData({poolProofSymbol: poolProofPolicy.hash})],
  )
  const rewardsHolderValidator = applyParamsToScriptExport(
    artifacts.parametricRewardsHolderValidator,
    [
      rewardsHolderConfigToMeshData({
        poolProofValidatorHash: poolProofValidator.hash,
        poolProofSymbol: poolProofPolicy.hash,
      }),
    ],
  )
  const refScriptCarrierValidator = getScriptFromExport(
    artifacts.refScriptCarrierValidator,
  )
  return {
    failProofPolicy,
    failProofValidator,
    poolProofPolicy,
    poolProofValidator,
    rewardsHolderValidator,
    refScriptCarrierValidator,
  }
}
