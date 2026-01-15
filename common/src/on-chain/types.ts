import type {LanguageVersion} from '@meshsdk/common'

export type Contract = {hex: string; hash: string; version: LanguageVersion}

export type ConstantContracts = {
  failProofPolicy: Contract
  failProofValidator: Contract
  poolProofPolicy: Contract
  poolProofValidator: Contract
}
