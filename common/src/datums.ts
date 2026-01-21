import {mConStr0, mConStr1} from '@meshsdk/common'

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

// Maybe<pair<pubkeyhash, integer>>
export const maybeNodeKeyToMeshData = (key: NodeKey | null) =>
  key ? mConStr0([mConStr0([key.hash, key.index])]) : mConStr1([])

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
