import type {CommitFoldDatum} from '@wingriders/multi-dex-launchpad-common'
import type {CommitFold} from '../../../prisma/generated/client'
import {commitFoldingStarted, getDbCommitFolds} from '../../db/commit-fold'
import {prismaTxOutputToMeshOutput} from '../../db/helpers'
import {logger} from '../../logger'
import {COMMIT_FOLDING_BATCH_SIZE} from '../constants'
import type {Cutoff} from '../cutoff'

// Compares calculated commit fold datum with commit fold from DB
const isEqual =
  (commitFoldDatum: CommitFoldDatum) => (dbCommitFold: CommitFold) =>
    dbCommitFold.committed === commitFoldDatum.committed &&
    ((dbCommitFold.nextKeyHash == null &&
      dbCommitFold.nextKeyIndex == null &&
      commitFoldDatum.next == null) ||
      (dbCommitFold.nextKeyHash === commitFoldDatum.next?.hash &&
        dbCommitFold.nextKeyIndex === commitFoldDatum.next?.index)) &&
    ((dbCommitFold.cutoffKeyHash == null &&
      dbCommitFold.cutoffKeyIndex == null &&
      commitFoldDatum.cutoffKey == null) ||
      (dbCommitFold.cutoffKeyHash === commitFoldDatum.cutoffKey?.hash &&
        dbCommitFold.cutoffKeyIndex === commitFoldDatum.cutoffKey?.index)) &&
    (dbCommitFold.cutoffTime && Number(dbCommitFold.cutoffTime)) ===
      commitFoldDatum.cutoffTime &&
    dbCommitFold.overcommitted === commitFoldDatum.overcommitted &&
    dbCommitFold.nodeCount === commitFoldDatum.nodeCount

const findLastDbCommitFold = async ({
  launchTxHash,
  ownerAddress,
  calculatedCommitFoldDatums,
  cutoff,
}: {
  launchTxHash: string
  ownerAddress: string
  calculatedCommitFoldDatums: {commitFoldDatum: CommitFoldDatum}[]
  cutoff?: Cutoff
}) => {
  const dbCommitFolds = await getDbCommitFolds(
    launchTxHash,
    ownerAddress,
    cutoff,
  )
  logger.info(`Found ${dbCommitFolds.length} unspent commit folds in DB`)

  for (let index = calculatedCommitFoldDatums.length - 1; index >= 0; index--) {
    const {commitFoldDatum} = calculatedCommitFoldDatums[index]!
    const dbCommitFold = dbCommitFolds.find(isEqual(commitFoldDatum))
    if (dbCommitFold) {
      logger.info(
        `Last matched commit fold on index = ${index}, nodeCount = ${dbCommitFold.nodeCount}`,
      )
      return {index, dbCommitFold}
    }
  }
  return undefined
}

export const getNextCommitFoldWithNodes = async <TNode>({
  launchTxHash,
  ownerAddress,
  nodesWithCommitFoldDatums,
  cutoff,
}: {
  launchTxHash: string
  ownerAddress: string
  nodesWithCommitFoldDatums: {node: TNode; commitFoldDatum: CommitFoldDatum}[]
  cutoff?: Cutoff
}) => {
  const lastMatched = await findLastDbCommitFold({
    launchTxHash,
    ownerAddress,
    calculatedCommitFoldDatums: nodesWithCommitFoldDatums,
    cutoff,
  })
  if (lastMatched) {
    const {index, dbCommitFold} = lastMatched
    if (index >= nodesWithCommitFoldDatums.length - 1) {
      logger.info(
        {launchTxHash},
        'Commit folding finished, last commit fold is unspent',
      )
      return null
    }
    const nextCommitFoldWithNodes = nodesWithCommitFoldDatums.slice(
      index + 1,
      index + 1 + COMMIT_FOLDING_BATCH_SIZE,
    )
    logger.info(
      `Prepared ${nextCommitFoldWithNodes.length} nodes to reference in the next commit fold`,
    )
    return {
      latestDbCommitFold: prismaTxOutputToMeshOutput(dbCommitFold.txOut),
      commitFoldDatum:
        nextCommitFoldWithNodes[nextCommitFoldWithNodes.length - 1]!
          .commitFoldDatum,
      nodes: nextCommitFoldWithNodes.map(({node}) => node),
    }
  }
  // There is no unspent commit fold

  if (await commitFoldingStarted(launchTxHash, ownerAddress, cutoff)) {
    logger.info('Commit folding finished, all commit fold utxos are spent')
    return null
  }
  logger.info('Commit folding not started, taking only head node')
  const {node, commitFoldDatum} = nodesWithCommitFoldDatums[0]!
  return {latestDbCommitFold: undefined, nodes: [node], commitFoldDatum}
}
