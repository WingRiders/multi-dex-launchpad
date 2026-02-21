import type {GeneratedContracts} from '@wingriders/multi-dex-launchpad-common'
import type {
  Launch,
  Node,
  RefScriptCarrier,
  TxOutput,
} from '../../../prisma/generated/client'
import {getWalletChangeAddress} from '../wallet'
import {buildAndSubmitCommitFoldTx} from './build-and-submit-commit-fold-tx'
import {calculateCommitFoldDatums} from './calculate-commit-folds'
import {calculateEligibilityWithCutoff} from './calculate-eligibility-with-cutoff'
import {getNextCommitFoldWithNodes} from './get-next-commit-fold-with-nodes'

type ExecuteCommitFoldingParams = {
  launch: Launch & {refScriptCarriers: (RefScriptCarrier & {txOut: TxOutput})[]}
  contracts: GeneratedContracts
  nodes: (Node & {txOut: TxOutput})[]
  latestSlot: number // Will serve as a validity start, should be > launch.endSlot
}

// Returns true if the commit fold transaction was submitted (to skip building other transactions)
export const executeCommitFolding = async ({
  launch,
  contracts,
  nodes,
  latestSlot,
}: ExecuteCommitFoldingParams) => {
  const {eligibleNodeKeys, cutoff} = calculateEligibilityWithCutoff(
    launch.projectMaxCommitment,
    nodes,
  )
  const nodesWithCommitFoldDatums = calculateCommitFoldDatums({
    nodes,
    eligibleNodeKeys,
    cutoff,
    nodeScriptHash: contracts.nodeValidator.hash,
    agentAddress: getWalletChangeAddress(),
  })
  const completeDataForTx = await getNextCommitFoldWithNodes({
    launchTxHash: launch.txHash,
    ownerAddress: getWalletChangeAddress(),
    nodesWithCommitFoldDatums,
    cutoff,
  })
  if (completeDataForTx == null) {
    // Commit folding finished, as logged in getNextCommitFoldWithNodes
    return false
  }
  await buildAndSubmitCommitFoldTx({
    ...completeDataForTx,
    launch,
    contracts,
    latestSlot,
  })
  return true
}
