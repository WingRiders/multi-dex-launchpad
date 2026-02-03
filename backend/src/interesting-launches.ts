import type {Unit} from '@meshsdk/common'
import {
  type ConstantValidator,
  createUnit,
  ensure,
  type GeneratedContracts,
  type GeneratedPolicy,
  type GeneratedValidator,
  generateLaunchpadContracts,
  SUNDAE_POOL_SCRIPT_HASH,
  WR_POOL_VALIDATOR_HASH,
} from '@wingriders/multi-dex-launchpad-common'
import {CONSTANT_CONTRACTS} from './agent/constants'
import {syncEventBuffer} from './agent/ogmios/chain-sync'
import {config} from './config'
import {prismaLaunchToLaunchConfig} from './db/helpers'
import {prisma} from './db/prisma-client'
import {logger} from './logger'

// When we aggregate launches, we track them in cache.
// Once a launch stops being interesting, it's no longer tracked.
// The tracking stops on the next flushing, not immediately.
// Interesting launches provide access to their contracts so the transactions can be parsed.
//
// A launch is defined as interesting if it has at least one associated unspent utxo
// or at least one of those utxos hasn't been created yet.
// Only spent utxos count towards making a launch not interesting.
//
// - node validator ref script carrier
// - node policy ref script carrier
// - first project tokens holder validator ref script carrier
// - project tokens holder policy ref script carrier
// - final project tokens holder validator ref script carrier
// - commit fold validator ref script carrier
// - commit fold policy ref script carrier
// - rewards fold validator ref script carrier
// - rewards fold policy ref script carrier
//
// - nodes
// - rewards holders
//
// - commit fold
// - rewards fold
// - first project tokens holder
// - final project tokens holder
//
// These, however, do not affect whether the launch is interesting
// - fail proof      <- unspendable
// - pool proofs     <- unspendable

// - wr/sundae pools <- samsaricly rebirthed every time they die
export type InterestingLaunch = {
  txHash: string
  projectUnit: Unit
  raisingUnit: Unit
}
let interestingLaunches: {
  launch: InterestingLaunch
  contracts: GeneratedContracts
}[] = []
// NOTE: invalid to use before the first reset
// Tracks constant script validator hashes
// and validator hashes associated with interesting launches
export let launchScriptHashes: Record<
  // utxo script hash
  string,
  | {
      // generated contracts carry the launch info
      type: GeneratedValidator | GeneratedPolicy
      launch: InterestingLaunch
      contracts: GeneratedContracts
    }
  | {
      // constant contracts need additional info to identify the launch
      type: ConstantValidator
      launch: null
      contracts: null
    }
> = {}

export const trackInterestingLaunch = (
  launch: InterestingLaunch,
  contracts: GeneratedContracts,
) => {
  interestingLaunches.push({launch, contracts})
  launchScriptHashes[contracts.nodeValidator.hash] = {
    type: 'node',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.nodePolicy.hash] = {
    type: 'nodePolicy',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.rewardsHolderValidator.hash] = {
    type: 'rewardsHolder',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.tokensHolderFirstValidator.hash] = {
    type: 'firstProjectTokensHolder',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.tokensHolderPolicy.hash] = {
    type: 'projectTokensHolderPolicy',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.tokensHolderFinalValidator.hash] = {
    type: 'finalProjectTokensHolder',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.commitFoldValidator.hash] = {
    type: 'commitFold',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.commitFoldPolicy.hash] = {
    type: 'commitFoldPolicy',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.rewardsFoldValidator.hash] = {
    type: 'rewardsFold',
    launch,
    contracts,
  }
  launchScriptHashes[contracts.rewardsFoldPolicy.hash] = {
    type: 'rewardsFoldPolicy',
    launch,
    contracts,
  }
}

export const resetInterestingLaunches = async () => {
  ensure(
    syncEventBuffer.length === 0,
    {syncEventBuffer},
    'Sync event buffer must be empty to reset the interesting launches cache',
  )
  const launches = await prisma.launch.findMany({
    // Non-interesting launches have all their important utxos spent
    // Interesting launches are NOT those
    where: {
      NOT: {
        AND: [
          {nodeValidatorRefScriptCarrier: {spentSlot: {not: null}}},
          {nodePolicyRefScriptCarrier: {spentSlot: {not: null}}},
          {
            firstProjectTokensHolderValidatorRefScriptCarrier: {
              spentSlot: {not: null},
            },
          },
          {
            projectTokensHolderPolicyRefScriptCarrier: {
              spentSlot: {not: null},
            },
          },
          {
            finalProjectTokensHolderValidatorRefScriptCarrier: {
              spentSlot: {not: null},
            },
          },
          {
            commitFoldValidatorRefScriptCarrier: {spentSlot: {not: null}},
          },
          {commitFoldPolicyRefScriptCarrier: {spentSlot: {not: null}}},
          {
            rewardsFoldValidatorRefScriptCarrier: {spentSlot: {not: null}},
          },
          {rewardsFoldPolicyRefScriptCarrier: {spentSlot: {not: null}}},
          {nodes: {some: {txOut: {spentSlot: {not: null}}}}},
          {rewardsHolders: {some: {txOut: {spentSlot: {not: null}}}}},
          {commitFold: {spentSlot: {not: null}}},
          {rewardsFold: {spentSlot: {not: null}}},
          {firstProjectTokensHolder: {spentSlot: {not: null}}},
          {finalProjectTokensHolder: {spentSlot: {not: null}}},
        ],
      },
    },
  })

  interestingLaunches = []
  launchScriptHashes = {
    [CONSTANT_CONTRACTS.failProofValidator.hash]: {
      type: 'failProof',
      launch: null,
      contracts: null,
    },
    [CONSTANT_CONTRACTS.poolProofValidator.hash]: {
      type: 'poolProof',
      launch: null,
      contracts: null,
    },
    [CONSTANT_CONTRACTS.refScriptCarrierValidator.hash]: {
      type: 'refScriptCarrier',
      launch: null,
      contracts: null,
    },
    [WR_POOL_VALIDATOR_HASH[config.NETWORK]]: {
      type: 'wrPool',
      launch: null,
      contracts: null,
    },
    [SUNDAE_POOL_SCRIPT_HASH[config.NETWORK]]: {
      type: 'sundaePool',
      launch: null,
      contracts: null,
    },
  }

  for (const launch of launches) {
    const contracts = await generateLaunchpadContracts(
      prismaLaunchToLaunchConfig(launch),
      CONSTANT_CONTRACTS,
    )
    trackInterestingLaunch(
      {
        txHash: launch.txHash,
        raisingUnit: createUnit(
          launch.raisingTokenPolicyId,
          launch.raisingTokenAssetName,
        ),
        projectUnit: createUnit(
          launch.projectTokenPolicyId,
          launch.projectTokenAssetName,
        ),
      },
      contracts,
    )
  }
  logger.debug(
    {
      interestingLaunches: interestingLaunches.map((l) => l.launch.txHash),
      launchValidatorHashes: Object.entries(launchScriptHashes).map(
        ([hash, {type}]) => ({hash, type}),
      ),
    },
    'Reset interesting launches',
  )
}

// TODO: ensure() that maybe?
// Here we assume there are no 2 launches with equal or flipped units
// i.e. for all launches X and Y the following never holds:
//          X.unitA == Y.unitB AND
//          X.unitB == Y.unitA
// we also expect the opposite to never hold:
//          X.unitA == Y.unitA AND
//          X.unitB == Y.unitB
// with these assumptions we can uniquely identify a launch by its units
//
// Scans all interesting launches in O(n) and returns the launch with the given units
export const interestingLaunchByUnits = (unitA: Unit, unitB: Unit) => {
  for (const launch of interestingLaunches) {
    if (
      (launch.launch.projectUnit === unitA &&
        launch.launch.raisingUnit === unitB) ||
      (launch.launch.projectUnit === unitB &&
        launch.launch.raisingUnit === unitA)
    )
      return launch.launch
  }
  return null
}
