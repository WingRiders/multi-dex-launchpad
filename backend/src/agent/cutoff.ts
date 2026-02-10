import type {NodeKey} from '@wingriders/multi-dex-launchpad-common'

type CalculateCutoffOptions = {
  usersNodes: Array<
    NodeKey & {
      createdTime: number
      committed: bigint
    }
  >
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
      a.createdTime - b.createdTime ||
      compareHexStrings(a.hash, b.hash) ||
      a.index - b.index,
  )

  for (const node of sortedUsersNodes) {
    totalCommittedSum = totalCommittedSum + node.committed
    if (totalCommittedSum > projectMaxCommitment) {
      return {
        cutoffKey: {
          hash: node.hash,
          index: node.index,
        },
        createdTime: node.createdTime,
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

const compareHexStrings = (a: string, b: string) =>
  Buffer.from(a, 'hex').compare(Buffer.from(b, 'hex'))
