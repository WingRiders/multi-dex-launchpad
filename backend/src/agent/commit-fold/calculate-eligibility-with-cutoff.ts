import type {Node} from '../../../prisma/generated/client'
import {compareBigInts, compareHexStrings} from '../helpers'
import {serializeNodeKey} from '../node'
import type {EligibilityWithCutoff} from '../types'

// Assumptions:
// 1. projectMaxCommitment > 0
// 2. nodes with committed = 0 cannot be a cutoff
//    - the previous node reaching projectMaxCommitment will be cutoff
// 3. if sum of committed of all nodes = projectMaxCommitment, then last node with committed > 0 is cutoff
export const calculateEligibilityWithCutoff = (
  projectMaxCommitment: bigint,
  nodes: Pick<Node, 'keyHash' | 'keyIndex' | 'committed' | 'createdTime'>[],
): EligibilityWithCutoff => {
  const sortedUserNodes = nodes
    .filter(
      (
        node,
      ): node is Pick<Node, 'committed' | 'createdTime'> & {
        keyHash: string
        keyIndex: number
      } => node.keyHash != null && node.keyIndex != null && node.committed > 0n,
    )
    .sort(
      (a, b) =>
        compareBigInts(a.createdTime, b.createdTime) ||
        compareHexStrings(a.keyHash, b.keyHash) ||
        a.keyIndex - b.keyIndex,
    )
  let totalCommitted = 0n
  const eligibleNodeKeys = new Set<string>()
  for (const node of sortedUserNodes) {
    const nodeKey = serializeNodeKey(node.keyHash, node.keyIndex)
    if (totalCommitted + node.committed <= projectMaxCommitment) {
      eligibleNodeKeys.add(nodeKey)
      totalCommitted += node.committed
      if (totalCommitted === projectMaxCommitment) {
        // Perfect match
        return {
          eligibleNodeKeys,
          cutoff: undefined,
        }
      }
    } else {
      // cutoff node
      eligibleNodeKeys.add(nodeKey)
      return {
        eligibleNodeKeys,
        cutoff: {
          cutoffKey: {hash: node.keyHash, index: node.keyIndex},
          overcommitted: totalCommitted + node.committed - projectMaxCommitment,
          createdTime: Number(node.createdTime),
        },
      }
    }
  }
  // Iterated all nodes and projectMaxCommitment was not hit.
  return {eligibleNodeKeys}
}
