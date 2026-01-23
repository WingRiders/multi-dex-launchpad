import {mConStr0} from '@meshsdk/common'
import {bech32AddressToMeshData, maybeToMeshData} from './helpers'
import type {Dex} from './types'

export type RefScriptCarrierDatum = {
  ownerPubKeyHash: string
  // POSIXTime
  deadline: number
}

export const refScriptCarrierDatumToMeshData = (datum: RefScriptCarrierDatum) =>
  mConStr0([datum.ownerPubKeyHash, datum.deadline])

export type NodeKey = {
  hash: string
  index: number
}

const nodeKeyToMeshData = (key: NodeKey) => mConStr0([key.hash, key.index])

// Maybe<pair<pubkeyhash, integer>>
export const maybeNodeKeyToMeshData = (maybeKey: NodeKey | null) =>
  maybeToMeshData(maybeKey, nodeKeyToMeshData)

export type NodeDatum = {
  key: NodeKey | null
  next: NodeKey | null
  // POSIXTime
  createdTime: number
  committed: number
}

export const nodeDatumToMeshData = (datum: NodeDatum) =>
  mConStr0([
    maybeNodeKeyToMeshData(datum.key),
    maybeNodeKeyToMeshData(datum.next),
    datum.createdTime,
    datum.committed,
  ])

export type TokensHolderFirstDatum = {
  nodeValidatorHash: string
}

export const tokensHolderFirstDatumToMeshData = (
  datum: TokensHolderFirstDatum,
) => datum.nodeValidatorHash

export type CommitFoldDatum = {
  nodeScriptHash: string
  next: NodeKey | null
  committed: number
  cutoffKey: NodeKey | null
  cutoffTime: number | null
  overcommitted: number
  nodeCount: number
  owner: string // Bech32 address
}

export const commitFoldDatumToMeshData = (datum: CommitFoldDatum) =>
  mConStr0([
    datum.nodeScriptHash,
    maybeNodeKeyToMeshData(datum.next),
    datum.committed,
    maybeNodeKeyToMeshData(datum.cutoffKey),
    maybeToMeshData(datum.cutoffTime, (t) => t),
    datum.overcommitted,
    datum.nodeCount,
    bech32AddressToMeshData(datum.owner),
  ])

export type RewardsFoldDatum = {
  nodeScriptHash: string
  next: NodeKey | null
  cutoffKey: NodeKey | null
  cutoffTime: number | null
  committed: number
  overcommitted: number
  commitFoldOwner: string
}

export const rewardsFoldDatumToMeshData = (datum: RewardsFoldDatum) =>
  mConStr0([
    datum.nodeScriptHash,
    maybeNodeKeyToMeshData(datum.next),
    maybeNodeKeyToMeshData(datum.cutoffKey),
    maybeToMeshData(datum.cutoffTime, (t) => t),
    datum.committed,
    datum.overcommitted,
    datum.commitFoldOwner,
  ])

export type RewardsHolderDatum = {
  owner: NodeKey
  projectSymbol: string
  projectToken: string
  raisingSymbol: string
  raisingToken: string
}

export const rewardsHolderDatumToMeshData = (datum: RewardsHolderDatum) =>
  mConStr0([
    mConStr0([datum.owner.hash, datum.owner.index]),
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
  ])

export type PoolProofDatum = {
  projectSymbol: string
  projectToken: string
  raisingSymbol: string
  raisingToken: string
  dex: Dex
}

export const poolProofDatumToMeshData = (datum: PoolProofDatum) =>
  mConStr0([
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
    datum.dex === 'WingRidersV2' ? 0 : 1,
  ])

export type FailProofDatum = {
  scriptHash: string
}

export const failProofDatumToMeshData = (datum: FailProofDatum) =>
  datum.scriptHash
