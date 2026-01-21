import type {LanguageVersion} from '@meshsdk/common'
import type {LaunchpadConfig} from '..'

export type Contract = {hex: string; hash: string; version: LanguageVersion}

export type ConstantContracts = {
  failProofPolicy: Contract
  failProofValidator: Contract
  poolProofPolicy: Contract
  poolProofValidator: Contract
  refScriptCarrierValidator: Contract
}

export type ProjectInfo = {
  title: string
  description: string
  url: string
  logoUrl: string
  tierInfoUrl?: string
  tokenomicsUrl: string
  whitepaperUrl?: string
  termsAndConditionsUrl?: string
  additionalUrl?: string
  socialLinks: string[]
  presaleTierName?: string
}

export type LaunchTxMetadata = {
  config: LaunchpadConfig
  projectInfo: ProjectInfo
}
