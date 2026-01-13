import {applyParamsToScriptExport, getScriptFromExport} from '@/helpers'
import {poolProofConfigToMeshData} from '@/launchpad-configs/pool-proof-config'
import {poolProofPolicyConfigToMeshData} from '@/launchpad-configs/pool-proof-policy-config'
import * as artifacts from '../on-chain/artifacts'

type GenerateConstantContractsParams = {
  wrPoolValidatorHash: string
  wrPoolSymbol: string
  sundaePoolScriptHash: string
  usesWr: boolean
}

type ConstantContract = {hex: string; hash: string}

type ConstantContracts = {
  failProofPolicy: ConstantContract
  failProofValidator: ConstantContract
  poolProofPolicy: ConstantContract
  poolProofValidator: ConstantContract
}

export const generateConstantContracts = async (
  params: GenerateConstantContractsParams,
): Promise<ConstantContracts> => {
  const failProofPolicy = getScriptFromExport(artifacts.failProofPolicy)
  const failProofValidator = getScriptFromExport(artifacts.failProofValidator)
  const poolProofPolicy = await applyParamsToScriptExport(
    artifacts.parametricPoolProofPolicy,
    [poolProofPolicyConfigToMeshData(params)],
  )
  const poolProofValidator = await applyParamsToScriptExport(
    artifacts.parametricPoolProofValidator,
    [poolProofConfigToMeshData({poolProofSymbol: poolProofPolicy.hash})],
  )
  return {
    failProofPolicy,
    failProofValidator,
    poolProofPolicy,
    poolProofValidator,
  }
}
