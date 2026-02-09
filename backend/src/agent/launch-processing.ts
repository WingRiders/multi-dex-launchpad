import type {
  Contract,
  GeneratedContracts,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import {RefScriptCarrierType} from '../../prisma/generated/client'
import {prisma} from '../db/prisma-client'
import type {InterestingLaunch} from '../interesting-launches'
import {logger} from '../logger'
import {deployContracts} from './transactions'

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
  // TODO: Otherwise if the launch hasn't started yet and doesn't have separator nodes,
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
        where: {txOut: {spentSlot: null}},
        select: {type: true},
      },
    },
  })

  // Deploy contracts if needed
  // We split the deployment into 5 phases so we fit into tx limits
  // It's important we always do that first so we always have contracts deployed
  for (const phase of [1, 2, 3, 4, 5] as const) {
    // TODO: we should chain these transactions
    const contractsToDeploy = getUndeployedLaunchContracts(
      launch.refScriptCarriers,
      contracts,
      phase,
    )
    if (contractsToDeploy.length > 0) {
      logger.info(
        {
          launchTxHash,
          phase,
          contracts: contractsToDeploy.map((c) => c.hash),
        },
        `Deploying contracts from phase ${phase}`,
      )
      const txHash = await deployContracts(contractsToDeploy)
      if (txHash)
        logger.info(
          {
            launchTxHash,
            txHash,
            contracts: contractsToDeploy.map((c) => c.hash),
            phase,
          },
          `Deployed contracts from phase ${phase}`,
        )
      else
        logger.error(
          {launchTxHash, phase},
          `Failed to deploy contracts from phase ${phase}`,
        )
      return
    }
    logger.info(
      {launchTxHash, phase},
      `No contracts to deploy in phase ${phase}`,
    )
  }

  // We check if the launch is in-progress and skip it
  if (time >= launch.startTime && time < launch.endTime) {
    logger.info({launchTxHash}, 'Launch in progress, skipping')
    return
  }

  // TODO: the rest of the actions
}

// Deployment is split into 4 phases so it fits into tx limits
//
// Phase 1:
// - rewards fold policy
// - node policy
// - commit fold policy
// - project tokens holder policy
//
// Phase 2:
// - commit fold validator
//
// NOTE: phases 2 and 3 can be unified probably if not using traces
//
// Phase 3:
// - final project tokens holder validator
//
// Phase 4:
// - rewards fold validator
// - first project tokens holder validator
//
// Phase 5:
// - node validator
const getUndeployedLaunchContracts = (
  deployedRefScriptCarriers: {type: RefScriptCarrierType}[],
  contracts: GeneratedContracts,
  phase: 1 | 2 | 3 | 4 | 5,
) => {
  const isDeployed = (t: RefScriptCarrierType) =>
    deployedRefScriptCarriers.some((c) => c.type === t)

  const undeployedContracts: Contract[] = []

  if (phase === 1) {
    if (!isDeployed(RefScriptCarrierType.REWARDS_FOLD_POLICY))
      undeployedContracts.push(contracts.rewardsFoldPolicy)
    if (!isDeployed(RefScriptCarrierType.NODE_POLICY))
      undeployedContracts.push(contracts.nodePolicy)
    if (!isDeployed(RefScriptCarrierType.COMMIT_FOLD_POLICY))
      undeployedContracts.push(contracts.commitFoldPolicy)
    if (!isDeployed(RefScriptCarrierType.PROJECT_TOKENS_HOLDER_POLICY))
      undeployedContracts.push(contracts.tokensHolderPolicy)
  }

  if (phase === 2) {
    if (!isDeployed(RefScriptCarrierType.COMMIT_FOLD_VALIDATOR))
      undeployedContracts.push(contracts.commitFoldValidator)
  }

  if (phase === 3) {
    if (!isDeployed(RefScriptCarrierType.FINAL_PROJECT_TOKENS_HOLDER_VALIDATOR))
      undeployedContracts.push(contracts.tokensHolderFinalValidator)
  }

  if (phase === 4) {
    if (!isDeployed(RefScriptCarrierType.REWARDS_FOLD_VALIDATOR))
      undeployedContracts.push(contracts.rewardsFoldValidator)
    if (!isDeployed(RefScriptCarrierType.FIRST_PROJECT_TOKENS_HOLDER_VALIDATOR))
      undeployedContracts.push(contracts.tokensHolderFirstValidator)
  }

  if (phase === 5) {
    if (!isDeployed(RefScriptCarrierType.NODE_VALIDATOR))
      undeployedContracts.push(contracts.nodeValidator)
  }

  return undeployedContracts
}
