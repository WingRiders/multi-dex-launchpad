import type {LanguageVersion} from '@meshsdk/common'

export type Contract = {hex: string; hash: string; version: LanguageVersion}

export type ConstantContracts = {
  failProofPolicy: Contract
  failProofValidator: Contract
  poolProofPolicy: Contract
  poolProofValidator: Contract
  refScriptCarrierValidator: Contract
}

export type ConstantValidator =
  | 'failProof'
  | 'poolProof'
  | 'refScriptCarrier'
  | 'wrPool'
  | 'sundaePool'

export type GeneratedValidator =
  | 'node'
  | 'rewardsHolder'
  | 'firstProjectTokensHolder'
  | 'finalProjectTokensHolder'
  | 'commitFold'
  | 'rewardsFold'
