import type {CommitFoldWhereInput} from '../../prisma/generated/models/CommitFold'
import type {Cutoff} from '../agent/cutoff'
import {prisma} from './prisma-client'

export const getCutoffWhereCondition = (
  cutoff?: Cutoff,
): CommitFoldWhereInput => {
  if (cutoff == null) {
    return {
      cutoffKeyHash: null,
      cutoffKeyIndex: null,
      cutoffTime: null,
      overcommitted: 0,
    }
  }
  return {
    cutoffKeyHash: cutoff.cutoffKey.hash,
    cutoffKeyIndex: cutoff.cutoffKey.index,
    cutoffTime: cutoff.createdTime,
    overcommitted: cutoff.overcommitted,
  }
}

export const getDbCommitFolds = (
  launchTxHash: string,
  ownerAddress: string,
  cutoff?: Cutoff,
) =>
  prisma.commitFold.findMany({
    where: {
      txOut: {
        spentSlot: null,
      },
      launchTxHash,
      ownerAddress,
      ...getCutoffWhereCondition(cutoff),
    },
    orderBy: [{nodeCount: 'desc'}], // TODO What if there are multiple? We may order by txHash, but perhaps we should have an autoincrement field to always continue with the latest
    include: {
      txOut: true,
    },
  })

export const commitFoldingStarted = async (
  launchTxHash: string,
  ownerAddress: string,
  cutoff?: Cutoff,
) => {
  const count = await prisma.commitFold.count({
    where: {
      launchTxHash,
      ownerAddress,
      ...getCutoffWhereCondition(cutoff),
    },
  })
  return count > 0
}
