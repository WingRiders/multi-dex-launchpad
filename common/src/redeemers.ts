import {mConStr, mConStr0, mConStr1, mConStr2} from '@meshsdk/common'
import {ensure} from './ensure'
import type {Tier} from './types'

export type InsertNodeRedeemer = {type: 'insert-node'; tier: Tier}
export type InsertSeparatorsRedeemer = {
  type: 'insert-separators'
  offset: number
}
export type RemoveCurrentNodeRedeemer = {type: 'remove-current-node'}
export type RemoveNextNodeRedeemer = {type: 'remove-next-node'}
export type StartRewardsFoldRedeemer = {type: 'start-rewards-fold'}
export type FailLaunchRedeemer = {type: 'fail-launch-redeemer'}
export type DelegateToRewardsFoldRedeemer = {
  type: 'delegate-to-rewards-fold'
  foldIndex: number
}
export type ReclaimAfterFailureRedeemer = {type: 'reclaim-after-failure'}
export type NodeEmergencyWithdrawalRedeemer = {
  type: 'node-emergency-withdrawal'
}
export type NodeRedeemer =
  | InsertNodeRedeemer
  | InsertSeparatorsRedeemer
  | RemoveCurrentNodeRedeemer
  | RemoveNextNodeRedeemer
  | StartRewardsFoldRedeemer
  | FailLaunchRedeemer
  | DelegateToRewardsFoldRedeemer
  | ReclaimAfterFailureRedeemer
  | NodeEmergencyWithdrawalRedeemer

export const nodeRedeemerToMeshData = (redeemer: NodeRedeemer) => {
  switch (redeemer.type) {
    case 'insert-node':
      return mConStr(0, [redeemer.tier === 'presale' ? 0n : 1n])

    case 'insert-separators':
      return mConStr(1, [redeemer.offset])

    case 'remove-current-node':
      return mConStr(2, [])

    case 'remove-next-node':
      return mConStr(3, [])

    case 'start-rewards-fold':
      return mConStr(4, [])

    case 'fail-launch-redeemer':
      return mConStr(5, [])

    case 'delegate-to-rewards-fold':
      return mConStr(6, [redeemer.foldIndex])

    case 'reclaim-after-failure':
      return mConStr(7, [])

    case 'node-emergency-withdrawal':
      return mConStr(8, [])

    default: {
      const _exhaustiveCheck: never = redeemer
      ensure(false, {redeemer}, 'Unknown node redeemer')
    }
  }
}

export type CommitFoldRedeemer =
  | {type: 'commit-fold'; nodes: number[]}
  | {type: 'delegate-commit-to-node'}
  | {type: 'commit-fold-emergency-withdrawal'}

export const commitFoldRedeemerToMeshData = (redeemer: CommitFoldRedeemer) => {
  switch (redeemer.type) {
    case 'commit-fold':
      return mConStr0([redeemer.nodes])
    case 'delegate-commit-to-node':
      return mConStr1([])
    case 'commit-fold-emergency-withdrawal':
      return mConStr2([])
    default: {
      const _exhaustiveCheck: never = redeemer
      ensure(false, {redeemer}, 'Unknown commit fold redeemer')
    }
  }
}

export type RewardsFoldRedeemer =
  | {
      type: 'rewards-fold'
      inputNodes: number[]
      outputNodes: number[]
      commitFoldCompensationIndex: number
      inputRewardsFoldIndex: number
      inputTokensHolderIndex: number
      daoCompensationIndex: number
      ownerCompensationIndex: number
    }
  | {type: 'rewards-fold-emergency-withdrawal'}

export const rewardsFoldRedeemerToMeshData = (
  redeemer: RewardsFoldRedeemer,
) => {
  switch (redeemer.type) {
    case 'rewards-fold':
      return mConStr0([
        redeemer.inputNodes,
        redeemer.outputNodes,
        redeemer.commitFoldCompensationIndex,
        redeemer.inputRewardsFoldIndex,
        redeemer.inputTokensHolderIndex,
        redeemer.daoCompensationIndex,
        redeemer.ownerCompensationIndex,
      ])
    case 'rewards-fold-emergency-withdrawal':
      return mConStr1([])
    default: {
      const _exhaustiveCheck: never = redeemer
      ensure(false, {redeemer}, 'Unknown rewards fold redeemer')
    }
  }
}

export type TokensHolderFirstRedeemer =
  | 'cancel-launch'
  | 'delegate-to-rewards-or-failure'
  | 'emergency-withdrawal'

export const tokensHolderFirstRedeemerToMeshData = (
  redeemer: TokensHolderFirstRedeemer,
) => {
  const constr = {
    'cancel-launch': 0,
    'delegate-to-rewards-or-failure': 1,
    'emergency-withdrawal': 2,
  }[redeemer]

  return mConStr(constr, [])
}
