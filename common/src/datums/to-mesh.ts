import {mConStr0} from '@meshsdk/common'
import {bech32AddressToMeshData, maybeToMeshData} from '../helpers'
import type {
  CommitFoldDatum,
  FailProofDatum,
  NodeDatum,
  NodeKey,
  PoolProofDatum,
  RefScriptCarrierDatum,
  RewardsFoldDatum,
  RewardsHolderDatum,
  TokensHolderFirstDatum,
} from './types'

export const refScriptCarrierDatumToMeshData = (datum: RefScriptCarrierDatum) =>
  mConStr0([datum.ownerPubKeyHash, datum.deadline])

const nodeKeyToMeshData = (key: NodeKey) => mConStr0([key.hash, key.index])

// Maybe<pair<pubkeyhash, integer>>
export const maybeNodeKeyToMeshData = (maybeKey: NodeKey | null) =>
  maybeToMeshData(maybeKey, nodeKeyToMeshData)

export const nodeDatumToMeshData = (datum: NodeDatum) =>
  mConStr0([
    maybeNodeKeyToMeshData(datum.key),
    maybeNodeKeyToMeshData(datum.next),
    datum.createdTime,
    datum.committed,
  ])

export const tokensHolderFirstDatumToMeshData = (
  datum: TokensHolderFirstDatum,
) => datum.nodeValidatorHash

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

export const rewardsHolderDatumToMeshData = (datum: RewardsHolderDatum) =>
  mConStr0([
    mConStr0([datum.owner.hash, datum.owner.index]),
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
    datum.usesWr ? 1 : 0,
    datum.usesSundae ? 1 : 0,
    datum.endTime,
  ])

export const poolProofDatumToMeshData = (datum: PoolProofDatum) =>
  mConStr0([
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
    datum.dex === 'WingRidersV2' ? 0 : 1,
  ])

export const failProofDatumToMeshData = (datum: FailProofDatum) =>
  datum.scriptHash
