import type {LanguageVersion} from '@meshsdk/common'

export type Contract = {hex: string; hash: string; version: LanguageVersion}

export type ConstantContracts = {
  failProofPolicy: Contract
  failProofValidator: Contract
  poolProofPolicy: Contract
  poolProofValidator: Contract
  rewardsHolderValidator: Contract
  refScriptCarrierValidator: Contract
}

export const constantValidators = [
  'failProof',
  'poolProof',
  'rewardsHolder',
  'refScriptCarrier',
  'wrPool',
  'sundaePool',
] as const
export type ConstantValidator = (typeof constantValidators)[number]

export const generatedValidators = [
  'node',
  'firstProjectTokensHolder',
  'finalProjectTokensHolder',
  'commitFold',
  'rewardsFold',
] as const
export type GeneratedValidator = (typeof generatedValidators)[number]

export const generatedPolicies = [
  'nodePolicy',
  'projectTokensHolderPolicy',
  'commitFoldPolicy',
  'rewardsFoldPolicy',
] as const
export type GeneratedPolicy = (typeof generatedPolicies)[number]

export const isGeneratedPolicyType = (
  type: ConstantValidator | GeneratedPolicy | GeneratedValidator,
): type is GeneratedPolicy =>
  generatedPolicies.some((policy) => policy === type)
