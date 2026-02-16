import {
  constantRefScriptsByNetwork,
  ensure,
  type GeneratedContracts,
} from '@wingriders/multi-dex-launchpad-common'

import {Result} from 'better-result'
import type {Launch, TxOutput} from '../../prisma/generated/client'
import {
  PoolProofType,
  RefScriptCarrierType,
} from '../../prisma/generated/client'
import {config} from '../config'

import {prisma} from '../db/prisma-client'
import type {InterestingLaunch} from '../interesting-launches'
import {logger} from '../logger'
import {SEPARATORS_TO_INSERT} from './constants'
import {deployContractsIfNeeded} from './deploy-contracts'
import {createPoolProof, insertSeparators} from './transactions'

// For passed launches run the next necessary step
// Runs one step only
export const processLaunches = async (
  launches: {
    launch: InterestingLaunch
    contracts: GeneratedContracts
  }[],
) => {
  for (const {
    launch: {txHash: launchTxHash},
    contracts,
  } of launches) {
    logger.info({launchTxHash}, 'Processing launch')
    const res = await Result.tryPromise(
      async () => await processLaunch(launchTxHash, contracts),
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
) => {
  // The first action we do is deploy the contracts if needed
  //
  // Otherwise if the launch hasn't started yet and doesn't have separator nodes,
  // we insert those
  //
  // If the launch hasn't finished yet, we skip it
  //
  // TODO: If the launch has ended and there's no commit fold, we create it
  //
  // TODO: If the launch has ended and there's a commit fold and unfolded nodes, we fold nodes
  //
  // TODO: If the launch has ended and there's a finished commit fold, we create a rewards fold
  //
  // TODO: If the launch has ended and there's a rewards fold and unfolded nodes, we fold nodes
  //
  // TODO: If the launch has ended and there are final project tokens holders, we create pools
  //
  // TODO: If there are pools and no pool proofs, we create them
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

  // We check if the launch is in-progress and skip it
  if (time >= launch.startTime && time < launch.endTime) {
    logger.info({launchTxHash}, 'Launch in progress, skipping')
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

  // We check if we should insert separators:
  //  - the launch has not started yet
  //  - there's only the head node
  const headNode = await findHeadNodeIfShouldInsertSeparators(time, launch)
  if (headNode) {
    logger.info(
      {launchTxHash, SEPARATORS_TO_INSERT},
      `Inserting ${SEPARATORS_TO_INSERT} separators`,
    )
    const txHash = await insertSeparators(
      contracts,
      launch,
      headNode,
      nodeValidatorRefScriptCarrier.txOut,
      nodePolicyRefScriptCarrier.txOut,
      SEPARATORS_TO_INSERT,
    )
    if (txHash) logger.info({launchTxHash, txHash}, 'Inserted separators')
    else logger.error({launchTxHash}, 'Failed to insert separators')
    return
  } else
    logger.info(
      {launchTxHash},
      'No separators to insert (either already inserted or the launch start time has passed)',
    )

  // TODO: the rest of the actions

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
    }
  } else logger.info({launchTxHash}, 'Sundae pool proof exists')
}

// It is only possible to insert separators before the start of the launch
// We also try to insert all separators in one transactions.
// That means we should do that if there's only one node in existence: the head node
// We return it if the separators should be inserted
// This name is horrendous.
const findHeadNodeIfShouldInsertSeparators = async (
  time: number,
  launch: Launch,
): Promise<TxOutput | null> => {
  if (time >= launch.startTime) return null

  const headNode = await prisma.node.findFirstOrThrow({
    select: {nextIndex: true, txOut: true},
    where: {
      launchTxHash: launch.txHash,
      keyHash: null,
      txOut: {spentSlot: null},
    },
  })
  // next != null means some nodes were inserted
  if (headNode.nextIndex != null) return null

  return headNode.txOut
}
