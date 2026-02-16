import type {NodeKey} from '@wingriders/multi-dex-launchpad-common'
import type {SetNonNullable} from 'type-fest'
import type {Node} from '../../prisma/generated/client'
import {compareBigInts, compareHexStrings} from './helpers'

type CalculateCutoffOptions = {
  usersNodes: SetNonNullable<
    Pick<Node, 'keyHash' | 'keyIndex' | 'createdTime' | 'committed'>,
    'keyHash' | 'keyIndex'
  >[]
  projectMaxCommitment: bigint
}

export type Cutoff = {
  cutoffKey: NodeKey
  createdTime: number
  overcommitted: bigint
}

export const calculateCutoff = ({
  usersNodes,
  projectMaxCommitment,
}: CalculateCutoffOptions): Cutoff | null => {
  let totalCommittedSum = 0n
  const sortedUsersNodes = [...usersNodes].sort(
    (a, b) =>
      compareBigInts(a.createdTime, b.createdTime) ||
      compareHexStrings(a.keyHash, b.keyHash) ||
      a.keyIndex - b.keyIndex,
  )

  for (const node of sortedUsersNodes) {
    totalCommittedSum = totalCommittedSum + node.committed
    if (totalCommittedSum > projectMaxCommitment) {
      return {
        cutoffKey: {
          hash: node.keyHash,
          index: node.keyIndex,
        },
        createdTime: Number(node.createdTime),
        overcommitted: totalCommittedSum - projectMaxCommitment,
      }
    }
  }

  return null
}

export const getOverCommittedQuantity = (
  cutoff: Cutoff,
  {
    nodeKey,
    createdTime,
    committed,
  }: {
    nodeKey: NodeKey
    createdTime: number
    committed: bigint
  },
) => {
  if (createdTime < cutoff.createdTime) return 0n
  if (createdTime === cutoff.createdTime) {
    if (nodeKey.hash < cutoff.cutoffKey.hash) return 0n
    if (nodeKey.hash === cutoff.cutoffKey.hash) {
      if (nodeKey.index < cutoff.cutoffKey.index) return 0n
      if (nodeKey.index === cutoff.cutoffKey.index) return cutoff.overcommitted
    }
  }
  return committed
}
