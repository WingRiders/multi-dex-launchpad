import type {CommitFoldDatum} from '@wingriders/multi-dex-launchpad-common'
import type {Node} from '../../../prisma/generated/client'
import {logger} from '../../logger'
import type {Cutoff} from '../cutoff'
import {serializeNodeKey} from '../node'

export const calculateCommitFoldDatums = <
  TNode extends Pick<
    Node,
    'keyHash' | 'keyIndex' | 'nextHash' | 'nextIndex' | 'committed'
  >,
>({
  nodes,
  eligibleNodeKeys,
  cutoff,
  nodeScriptHash,
  agentAddress,
}: {
  nodes: TNode[]
  eligibleNodeKeys: Set<string>
  cutoff?: Cutoff
  nodeScriptHash: string
  agentAddress: string
}): {node: TNode; commitFoldDatum: CommitFoldDatum}[] => {
  logger.info(
    `calculateCommitFolds for ${nodes.length} nodes (${eligibleNodeKeys.size} eligible, with${
      cutoff == null ? 'out' : ''
    } cutoff node)`,
  )

  let committed = 0n

  const result = nodes.map((node, i) => {
    // accumulate only eligible non-head nodes
    if (node.keyHash != null && node.keyIndex != null) {
      if (eligibleNodeKeys.has(serializeNodeKey(node.keyHash, node.keyIndex))) {
        committed += node.committed

        if (
          node.keyHash === cutoff?.cutoffKey.hash &&
          node.keyIndex === cutoff?.cutoffKey.index
        ) {
          committed -= cutoff.overcommitted
        }
      }
    }

    return {
      node,
      commitFoldDatum: {
        nodeScriptHash,
        next:
          node.nextHash != null && node.nextIndex != null
            ? {hash: node.nextHash, index: node.nextIndex}
            : null,
        committed,
        cutoffKey: cutoff?.cutoffKey ?? null,
        cutoffTime: cutoff?.createdTime ?? null,
        overcommitted: cutoff?.overcommitted ?? 0n,
        nodeCount: i + 1,
        owner: agentAddress,
      },
    }
  })

  logger.info(`Calculated ${result.length} commit fold datums`)
  return result
}
