import {
  constantRefScriptsByNetwork,
  DEFAULT_TX_VALIDITY_START_BACKDATE_SLOTS,
  ensure,
  type GeneratedContracts,
} from '@wingriders/multi-dex-launchpad-common'

import {Result} from 'better-result'
import {
  type CommitFold,
  type Launch,
  PoolProofType,
  RefScriptCarrierType,
} from '../../prisma/generated/client'
import {timeToSlot} from '../common'
import {config} from '../config'
import {getUnspentNodes} from '../db/node'
import {prisma} from '../db/prisma-client'
import type {InterestingLaunch} from '../interesting-launches'
import {logger} from '../logger'
import {executeCommitFolding} from './commit-fold/execute-commit-folding'
import {SEPARATORS_TO_INSERT} from './constants'
import {deployContractsIfNeeded} from './deploy-contracts'
import {createFailProof} from './fail-proof'
import {isSeparator} from './node'
import {
  createPoolProof,
  createRewardsFold,
  insertSeparators,
} from './transactions'
import {getWalletChangeAddress} from './wallet'

// For passed launches run the next necessary step
// Runs one step only
export const processLaunches = async (
  launches: {
    launch: InterestingLaunch
    contracts: GeneratedContracts
  }[],
  latestSlot: number,
) => {
  for (const {
    launch: {txHash: launchTxHash},
    contracts,
  } of launches) {
    logger.info({launchTxHash}, 'Processing launch')
    const res = await Result.tryPromise(
      async () => await processLaunch(launchTxHash, contracts, latestSlot),
    )
    if (res.isErr())
      logger.error(
        {error: res.error, launchTxHash},
        'Unexpected error while processing launch',
      )
  }
}

const processLaunch = async (
  launchTxHash: string,
  contracts: GeneratedContracts,
  latestSlot: number,
) => {
  // The first action we do is deploy the contracts if needed
  //
  // Otherwise if the launch hasn't started yet and doesn't have separator nodes,
  // we insert those
  //
  // If the launch hasn't finished yet, we skip it
  //
  // If the launch has ended and there's no commit fold, we create it
  //
  // If the launch has ended and there's a commit fold and unfolded nodes, we fold nodes
  //
  // If the launch has ended and there's a finished commit fold, we create a rewards fold
  //
  // TODO: If the launch has ended and there's a rewards fold and unfolded nodes, we fold nodes
  //
  // TODO: If the launch has ended and there are final project tokens holders, we create pools
  //
  // If there are pools and no pool proofs, we create them
  //
  // fail proof if needed
  const time = Date.now()

  // TODO: that probably can be cached in the interestingLaunches
  const launch = await prisma.launch.findUniqueOrThrow({
    where: {
      txHash: launchTxHash,
    },
    include: {
      refScriptCarriers: {
        include: {txOut: true},
        where: {txOut: {spentSlot: null}},
      },
    },
  })

  const deployWasNeeded = await deployContractsIfNeeded(launch, contracts)
  if (deployWasNeeded) {
    // Wait for next block so we aggregate everything correctly
    return
  }

  // we can assume all the validators have been deployed by now
  const nodeValidatorRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.NODE_VALIDATOR,
  )
  ensure(
    nodeValidatorRefScriptCarrier != null,
    {launchTxHash},
    'Node validator ref script carrier must exist',
  )
  const nodePolicyRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.NODE_POLICY,
  )
  ensure(
    nodePolicyRefScriptCarrier != null,
    {launchTxHash},
    'Node policy ref script carrier must exist',
  )
  const commitFoldValidatorRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.COMMIT_FOLD_VALIDATOR,
  )
  ensure(
    commitFoldValidatorRefScriptCarrier != null,
    {launchTxHash},
    'Commit fold ref script carrier must exist',
  )
  const commitFoldPolicyRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.COMMIT_FOLD_POLICY,
  )
  ensure(
    commitFoldPolicyRefScriptCarrier != null,
    {launchTxHash},
    'Commit fold policy ref script carrier must exist',
  )
  const rewardsFoldPolicyRefScriptCarrier = launch.refScriptCarriers.find(
    (c) => c.type === RefScriptCarrierType.REWARDS_FOLD_POLICY,
  )
  ensure(
    rewardsFoldPolicyRefScriptCarrier != null,
    {launchTxHash},
    'Rewards fold policy ref script carrier must exist',
  )

  if (time < launch.startTime) {
    // If there is only head node, we insert separators
    const headNode = await prisma.node.findFirst({
      select: {txOut: true},
      where: {
        launchTxHash,
        keyHash: null,
        keyIndex: null,
        nextHash: null,
        nextIndex: null,
        txOut: {spentSlot: null},
      },
    })
    if (headNode) {
      logger.info(
        {launchTxHash, SEPARATORS_TO_INSERT},
        `Inserting ${SEPARATORS_TO_INSERT} separators`,
      )
      const txHash = await insertSeparators(
        contracts,
        launch,
        headNode.txOut,
        nodeValidatorRefScriptCarrier.txOut,
        nodePolicyRefScriptCarrier.txOut,
        SEPARATORS_TO_INSERT,
      )
      if (txHash) logger.info({launchTxHash, txHash}, 'Inserted separators')
      else logger.error({launchTxHash}, 'Failed to insert separators')
      return
    }
    logger.info(
      {
        launchTxHash,
        secondsToStart: (Number(launch.startTime) - time) / 1000,
      },
      'No separators to insert (already inserted)',
    )
    // No other action needed before launch starts
    return
  } else
    logger.info(
      {launchTxHash},
      'No separators to insert (launch start time has passed)',
    )

  // We check if the launch is in-progress and skip it
  const endSlot = timeToSlot(launch.endTime)
  if (latestSlot <= endSlot) {
    logger.info(
      {launchTxHash, slotsToEnd: endSlot - latestSlot},
      'Launch in progress, skipping',
    )
    return
  }

  const foldingStartAfterSlot =
    endSlot + DEFAULT_TX_VALIDITY_START_BACKDATE_SLOTS

  if (latestSlot <= foldingStartAfterSlot) {
    logger.info(
      {
        launchTxHash,
        endSlot,
        latestSlot,
        foldingStartAfterSlot,
      },
      `Launch ended but waiting for next block to be more than ${DEFAULT_TX_VALIDITY_START_BACKDATE_SLOTS} slots after launch ends`,
    )
    return
  }

  // If the launch ended, we execute finish flow (folding, pool creation, pool proof)
  logger.info({launchTxHash}, 'Launch ended. Loading nodes...')

  // allNodes include head node and separator nodes, also those spent by rewards fold, which occurs after endSlot
  const allNodes = await getUnspentNodes(launchTxHash, endSlot)
  if (
    allNodes.length === 0 ||
    allNodes[0]!.keyHash != null ||
    allNodes[0]!.keyIndex != null
  ) {
    throw new Error(`Nodes unspent at slot ${endSlot} do not contain head node`)
  }
  const unspentNodes = allNodes.filter(({txOut}) => txOut.spentSlot == null)
  if (allNodes.length === unspentNodes.length) {
    // No spent node = rewards folding did not start
    // In case last commit fold was already submitted, executeCommitFolding returns early with wasTxSubmitted = false so we can continue with initial rewards fold
    const wasTxSubmitted = await executeCommitFolding({
      launch,
      contracts,
      nodes: allNodes,
      latestSlot,
    })
    if (wasTxSubmitted) return
  }

  const finishedCommitFold = await prisma.commitFold.findFirst({
    include: {txOut: true},
    where: {
      // related to this launch
      launchTxHash,
      // signed by the agent
      ownerAddress: getWalletChangeAddress(),
      // finished: no next node to fold
      nextKeyIndex: null,
      // unspent
      txOut: {spentSlot: null},
    },
  })
  if (finishedCommitFold) {
    // Head node will be spent in the next transaction, which is either:
    // - initial rewards fold
    // - fail proof
    const headNode = await prisma.node.findFirstOrThrow({
      select: {txOut: true},
      where: {
        launchTxHash,
        keyHash: null,
        txOut: {spentSlot: null},
      },
    })
    ensure(
      headNode != null,
      {launchTxHash, finishedCommitFold},
      'Head node must exist if there is finishedCommitFold',
    )
    // For successful launches, we create rewards fold
    if (didLaunchSucceed(launch, finishedCommitFold)) {
      logger.info({launchTxHash}, 'Launch succeeded, creating rewards fold')
      const txHash = await createRewardsFold(
        launch,
        contracts,
        commitFoldValidatorRefScriptCarrier.txOut,
        commitFoldPolicyRefScriptCarrier.txOut,
        rewardsFoldPolicyRefScriptCarrier.txOut,
        nodeValidatorRefScriptCarrier.txOut,
        nodePolicyRefScriptCarrier.txOut,
        finishedCommitFold.txOut,
        headNode.txOut,
      )
      if (txHash) logger.info({launchTxHash, txHash}, 'Created rewards fold')
      else logger.error({launchTxHash}, 'Failed to create rewards fold')
      return
    }

    logger.info(
      {
        launchTxHash,
        projectMinCommitment: launch.projectMinCommitment,
        committed: finishedCommitFold.committed,
      },
      'Launch did not succeed, creating fail proof',
    )
    const failProof = await prisma.failProof.findFirst({where: {launchTxHash}})
    ensure(
      failProof == null,
      {launchTxHash, failProof, finishedCommitFold, headNode},
      'Fail proof must not exist if there is unspent head node and finishedCommitFold',
    )
    const firstTokenHolder = await prisma.firstProjectTokensHolder.findFirst({
      select: {txOut: true},
      where: {launchTxHash},
    })
    ensure(
      firstTokenHolder != null,
      {launchTxHash},
      'First token holder must exist if there is unspent head node and finishedCommitFold',
    )
    await createFailProof(
      launch,
      contracts,
      finishedCommitFold,
      headNode.txOut,
      nodeValidatorRefScriptCarrier.txOut,
      nodePolicyRefScriptCarrier.txOut,
      firstTokenHolder.txOut,
    )
    return
  }

  // Finished commit fold was spent, so either rewards fold or fail proof was executed.
  const failProof = await prisma.failProof.findFirst({where: {launchTxHash}})
  if (failProof != null) {
    const unspentNodes = await getUnspentNodes(launchTxHash)
    const unspentSeparators = unspentNodes.filter(isSeparator)
    if (unspentSeparators.length > 0) {
      logger.info(
        {launchTxHash},
        `Fail proof is confirmed, reclaiming ${unspentSeparators.length} separators`,
      )
      // TODO Reclaim separators
      return
    }
    if (unspentNodes.length > 0) {
      logger.info(
        {launchTxHash},
        `Fail proof is confirmed, separators are reclaimed. Waiting for ${unspentNodes.length} user nodes to be reclaimed, then we undeploy generated contracts`,
      )
      return
    }
    const unspentRefScriptCarriers = launch.refScriptCarriers.filter(
      ({txOut}) => txOut.spentSlot == null,
    )
    if (unspentRefScriptCarriers.length > 0) {
      logger.info(
        {launchTxHash},
        `Fail proof is confirmed, all nodes are reclaimed. Undeploying ${unspentRefScriptCarriers.length} generated contracts`,
      )
      // TODO Undeploy contracts
      return
    }
    logger.info({launchTxHash}, 'Fail flow finished')
    return
  }

  // TODO: keep cache of submitted pool proofs like with commit fold
  // We check if there are pools but no pool proofs
  // we create those if needed
  const poolProofs = await prisma.poolProof.findMany({
    where: {launchTxHash, txOut: {spentSlot: null}},
    select: {type: true, txOut: true},
  })

  if (!poolProofs.some((p) => p.type === PoolProofType.WR)) {
    const wrPool = await prisma.wrPool.findFirst({
      where: {launchTxHash, txOut: {spentSlot: null}},
      select: {txOut: true},
    })
    if (!wrPool) logger.info({launchTxHash}, 'No WingRiders pool created yet')
    else {
      logger.info({launchTxHash}, 'Creating WingRiders pool proof')
      const txHash = await createPoolProof(
        launch,
        wrPool.txOut,
        'WingRidersV2',
        constantRefScriptsByNetwork[config.NETWORK].poolProofPolicy,
      )
      if (txHash)
        logger.info({launchTxHash, txHash}, 'Created WingRiders pool proof')
      else
        logger.error({launchTxHash}, 'Failed to create WingRiders pool proof')
      return
    }
  } else logger.info({launchTxHash}, 'WingRiders pool proof exists')

  if (!poolProofs.some((p) => p.type === PoolProofType.SUNDAE)) {
    const sundaePool = await prisma.sundaePool.findFirst({
      where: {launchTxHash, txOut: {spentSlot: null}},
      select: {txOut: true},
    })
    if (!sundaePool) logger.info({launchTxHash}, 'No Sundae pool created yet')
    else {
      logger.info({launchTxHash}, 'Creating Sundae pool proof')
      const txHash = await createPoolProof(
        launch,
        sundaePool.txOut,
        'SundaeSwapV3',
        constantRefScriptsByNetwork[config.NETWORK].poolProofPolicy,
      )
      if (txHash)
        logger.info({launchTxHash, txHash}, 'Created Sundae pool proof')
      else logger.error({launchTxHash}, 'Failed to create Sundae pool proof')
      return
    }
  } else logger.info({launchTxHash}, 'Sundae pool proof exists')
}

const didLaunchSucceed = (launch: Launch, finishedCommitFold: CommitFold) =>
  finishedCommitFold.committed >= launch.projectMinCommitment
