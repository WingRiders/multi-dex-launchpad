import type {Dex} from '../types'

export type RefScriptCarrierDatum = {
  ownerPubKeyHash: string
  // POSIXTime
  deadline: number
}

export type NodeKey = {
  hash: string
  index: number
}

export type NodeDatum = {
  key: NodeKey | null
  next: NodeKey | null
  createdTime: number
  committed: bigint
}

export type TokensHolderFirstDatum = {
  nodeValidatorHash: string
}

export type CommitFoldDatum = {
  nodeScriptHash: string
  next: NodeKey | null
  committed: bigint
  cutoffKey: NodeKey | null
  cutoffTime: number | null
  overcommitted: bigint
  nodeCount: number
  owner: string // Bech32 address
}

export type RewardsFoldDatum = {
  nodeScriptHash: string
  next: NodeKey | null
  cutoffKey: NodeKey | null
  cutoffTime: number | null
  committed: bigint
  overcommitted: bigint
  commitFoldOwner: string
}

export type RewardsHolderDatum = {
  owner: NodeKey
  projectSymbol: string
  projectToken: string
  raisingSymbol: string
  raisingToken: string
  usesWr: boolean
  usesSundae: boolean
  endTime: number
}

export type PoolProofDatum = {
  projectSymbol: string
  projectToken: string
  raisingSymbol: string
  raisingToken: string
  dex: Dex
}

export type FailProofDatum = {
  scriptHash: string
}

export type WrPoolDatum = {
  requestValidatorHash: string
  assetASymbol: string
  assetAToken: string
  assetBSymbol: string
  assetBToken: string
  swapFeeInBasis: number
  protocolFeeInBasis: number
  projectFeeInBasis: number
  reserveFeeInBasis: number
  feeBasis: number
  agentFeeAda: number
  lastInteraction: number
  treasuryA: number
  treasuryB: number
  projectTreasuryA: number
  projectTreasuryB: number
  reserveTreasuryA: number
  reserveTreasuryB: number
  projectBeneficiary: string | null
  reserveBeneficiary: string | null
}

export type SundaePoolDatum = {
  identifier: string
  assetA: string
  assetB: string
  circulatingLp: number
  bidFeesPer10Thousand: number
  askFeesPer10Thousand: number
  feeManager: MultisigScript | null
  marketOpen: number
  protocolFees: number
}

// defining a separate type outside of Zod schema because the circular dependency doesn't work well with Zod in this case
export type MultisigScript =
  | {type: 'MultisigSignature'; keyHash: string}
  | {type: 'MultisigAllOf'; scripts: MultisigScript[]}
  | {type: 'MultisigAnyOf'; scripts: MultisigScript[]}
  | {type: 'MultisigAtLeast'; required: number; scripts: MultisigScript[]}
  | {type: 'MultisigBefore'; time: number}
  | {type: 'MultisigAfter'; time: number}
  | {type: 'MultisigScript'; scriptHash: string}

export type FinalProjectTokensHolderDatum = Dex
