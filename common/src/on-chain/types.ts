import type {LanguageVersion, Network} from '@meshsdk/common'
import type {NetworkId} from '@meshsdk/core-cst'

export type Contract = {hex: string; hash: string; version: LanguageVersion}

export type ConstantContracts = {
  failProofPolicy: Contract
  failProofValidator: Contract
  poolProofPolicy: Contract
  poolProofValidator: Contract
  refScriptCarrierValidator: Contract
}

export const networkToNetworkId: Record<Network, NetworkId> = {
  mainnet: 1,
  preprod: 0,
  preview: 0,
  testnet: 0,
} as const
