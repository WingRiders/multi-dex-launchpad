import {mConStr0} from '@meshsdk/common'
import type {Data} from '@meshsdk/core'

export type PoolProofPolicyConfig = {
  wrPoolValidatorHash: string
  // Policy ID of the pool validity token
  wrPoolSymbol: string
  // Both validator and minting policy share the script
  sundaePoolScriptHash: string
}

export const poolProofPolicyConfigToMeshData = (
  config: PoolProofPolicyConfig,
): Data =>
  mConStr0([
    config.wrPoolValidatorHash,
    config.wrPoolSymbol,
    config.sundaePoolScriptHash,
  ])
