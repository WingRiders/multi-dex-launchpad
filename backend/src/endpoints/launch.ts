import type {TxInput, UTxO} from '@meshsdk/common'
import type {
  LaunchConfig,
  LaunchTimeStatus,
  ProjectInfoTxMetadata,
} from '@wingriders/multi-dex-launchpad-common'
import {max} from 'es-toolkit/compat'
import type {Prisma} from '../../prisma/generated/client'
import {timeToSlot} from '../common'
import {
  deserializeValue,
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../db/helpers'
import {prisma} from '../db/prisma-client'

export const getLaunches = async (
  timeStatus?: LaunchTimeStatus,
): Promise<
  {
    txHash: string
    title: string
    description: string
    logoIpfsUrl: string
    startTime: Date
    defaultStartTime: Date
    endTime: Date
  }[]
> => {
  const now = Date.now()

  const where: Prisma.LaunchWhereInput | undefined = {
    upcoming: {
      startTime: {
        gt: now,
      },
    },
    active: {
      startTime: {
        lte: now,
      },
      endTime: {
        gt: now,
      },
    },
    past: {
      endTime: {
        lt: now,
      },
    },
    all: undefined,
  }[timeStatus ?? 'all']

  const orderBy: Prisma.LaunchOrderByWithRelationInput = {
    upcoming: {
      startTime: 'asc',
    },
    active: {
      startTime: 'desc',
    },
    past: {
      endTime: 'desc',
    },
    all: {
      startTime: 'asc',
    },
  }[timeStatus ?? 'all'] as Prisma.LaunchOrderByWithRelationInput

  const launches = await prisma.launch.findMany({
    where,
    orderBy,
    select: {
      txHash: true,
      projectTitle: true,
      projectDescription: true,
      projectLogoUrl: true,
      startTime: true,
      defaultStartTime: true,
      endTime: true,
      firstProjectTokensHolders: {
        where: {
          txOut: {
            spentSlot: {not: null},
          },
        },
        select: {
          txOut: {
            // TODO: Here we could just select the max
            select: {spentSlot: true},
          },
        },
      },
    },
  })

  return (
    launches
      // filter out cancelled launches
      .filter(
        ({startTime, firstProjectTokensHolders}) =>
          !isLaunchCancelled(
            Number(startTime),
            // We get all historical first project token holder utxos here
            // and we select the highest spentSlot, i.e. the most recent one
            // cancelled launches would have one spent utxo here
            max(firstProjectTokensHolders.map((h) => h.txOut.spentSlot)),
          ),
      )
      .map(
        ({
          txHash,
          projectTitle,
          projectDescription,
          projectLogoUrl,
          startTime,
          defaultStartTime,
          endTime,
        }) => ({
          txHash,
          title: projectTitle,
          description: projectDescription,
          logoIpfsUrl: projectLogoUrl,
          startTime: new Date(Number(startTime)),
          defaultStartTime: new Date(Number(defaultStartTime)),
          endTime: new Date(Number(endTime)),
        }),
      )
  )
}

// launch is cancelled if the first tokens holder was spent before the launch started
const isLaunchCancelled = (
  startTime: number,
  firstTokensHolderSpentSlot: number | null | undefined,
) =>
  firstTokensHolderSpentSlot != null &&
  firstTokensHolderSpentSlot < timeToSlot(startTime)

export const getLaunchesOwnedBy = async (
  ownerBech32Address: string,
): Promise<
  {
    txHash: string
    title: string
    projectToken: string
    totalTokens: bigint
    isCancelled: boolean
  }[]
> => {
  const launches = await prisma.launch.findMany({
    where: {ownerBech32Address},
    orderBy: {startTime: 'desc'},
    select: {
      txHash: true,
      projectTitle: true,
      projectTokenPolicyId: true,
      projectTokenAssetName: true,
      totalTokens: true,
      startTime: true,
      firstProjectTokensHolders: {
        where: {
          txOut: {
            spentSlot: {not: null},
          },
        },
        select: {
          txOut: {
            select: {spentSlot: true},
          },
        },
      },
    },
  })

  return launches.map(
    ({
      txHash,
      projectTitle,
      projectTokenPolicyId,
      projectTokenAssetName,
      totalTokens,
      startTime,
      firstProjectTokensHolders,
    }) => {
      const isCancelled = isLaunchCancelled(
        Number(startTime),
        max(firstProjectTokensHolders.map((h) => h.txOut.spentSlot)),
      )
      return {
        txHash,
        title: projectTitle,
        projectToken: `${projectTokenPolicyId}${projectTokenAssetName}`,
        totalTokens,
        isCancelled,
      }
    },
  )
}

export const getLaunch = async (
  txHash: string,
): Promise<{
  projectInfo: ProjectInfoTxMetadata
  config: LaunchConfig
  totalCommitted: bigint
  isCancelled: boolean
}> => {
  const launch = await prisma.launch.findUnique({
    where: {
      txHash,
    },
    select: {
      txHash: true,
      projectTitle: true,
      projectDescription: true,
      projectUrl: true,
      projectLogoUrl: true,
      projectTokenomicsUrl: true,
      projectWhitepaperUrl: true,
      projectTermsAndConditionsUrl: true,
      projectAdditionalUrl: true,
      ownerBech32Address: true,
      splitBps: true,
      wrPoolValidatorHash: true,
      wrFactoryValidatorHash: true,
      wrPoolCurrencySymbol: true,
      sundaePoolScriptHash: true,
      sundaeFeeTolerance: true,
      sundaeSettingsCurrencySymbol: true,
      startTime: true,
      endTime: true,
      projectTokenPolicyId: true,
      projectTokenAssetName: true,
      raisingTokenPolicyId: true,
      raisingTokenAssetName: true,
      projectMinCommitment: true,
      projectMaxCommitment: true,
      totalTokens: true,
      tokensToDistribute: true,
      raisedTokensPoolPartPercentage: true,
      daoFeeNumerator: true,
      daoFeeDenominator: true,
      daoFeeReceiverBech32Address: true,
      daoAdminPubKeyHash: true,
      collateral: true,
      starterTxHash: true,
      starterOutputIndex: true,
      vestingPeriodDuration: true,
      vestingPeriodDurationToFirstUnlock: true,
      vestingPeriodInstallments: true,
      vestingPeriodStart: true,
      vestingValidatorHash: true,
      presaleTierCs: true,
      presaleTierStartTime: true,
      defaultStartTime: true,
      presaleTierMinCommitment: true,
      defaultTierMinCommitment: true,
      presaleTierMaxCommitment: true,
      defaultTierMaxCommitment: true,
      nodeAda: true,
      commitFoldFeeAda: true,
      oilAda: true,
      firstProjectTokensHolders: {
        where: {
          txOut: {
            spentSlot: {not: null},
          },
        },
        select: {
          txOut: {
            select: {spentSlot: true},
          },
        },
      },
    },
  })

  if (!launch) {
    throw new Error(`Launch with txHash ${txHash} not found`)
  }

  const launchEndSlot = timeToSlot(launch.endTime)

  const totalCommitted = await prisma.node.aggregate({
    where: {
      launchTxHash: txHash,
      txOut: {
        OR: [
          {spentSlot: null},
          // we want to include nodes that were spent after the launch ended (either reclaimed or folded)
          {spentSlot: {gt: launchEndSlot}},
        ],
      },
    },
    _sum: {
      // head node and separators have committed set to 0 so there is no need to filter them out
      committed: true,
    },
  })

  return {
    projectInfo: {
      title: launch.projectTitle,
      description: launch.projectDescription,
      url: launch.projectUrl,
      logoUrl: launch.projectLogoUrl,
      tokenomicsUrl: launch.projectTokenomicsUrl,
      whitepaperUrl: launch.projectWhitepaperUrl ?? undefined,
      termsAndConditionsUrl: launch.projectTermsAndConditionsUrl ?? undefined,
      additionalUrl: launch.projectAdditionalUrl ?? undefined,
    },
    config: prismaLaunchToLaunchConfig(launch),
    totalCommitted: totalCommitted._sum.committed ?? 0n,
    isCancelled: isLaunchCancelled(
      Number(launch.startTime),
      max(launch.firstProjectTokensHolders.map((h) => h.txOut.spentSlot)),
    ),
  }
}

export const getFirstProjectTokensHolderUTxO = async (
  launchTxHash: string,
): Promise<UTxO> => {
  const firstProjectTokensHolder =
    // Gets the most recent first project tokens holder utxo
    await prisma.firstProjectTokensHolder.findFirst({
      select: {txOut: true},
      where: {launchTxHash, txOut: {spentSlot: null}},
    })

  if (firstProjectTokensHolder == null) {
    throw new Error(
      `First project tokens holder not found for launch ${launchTxHash}`,
    )
  }

  return prismaTxOutputToMeshOutput(firstProjectTokensHolder.txOut)
}

export const getUserRewardsHolders = async (
  launchTxHash: string,
  ownerPubKeyHash: string,
): Promise<
  {
    txHash: string
    outputIndex: number
    rewards: bigint
    isSpent: boolean
  }[]
> => {
  const rewardsHolders = await prisma.rewardsHolder.findMany({
    where: {
      launchTxHash,
      ownerHash: ownerPubKeyHash,
    },
    select: {
      txOut: {
        select: {
          txHash: true,
          outputIndex: true,
          spentSlot: true,
          value: true,
        },
      },
      launch: {
        select: {
          projectTokenPolicyId: true,
          projectTokenAssetName: true,
        },
      },
    },
  })

  return rewardsHolders.map(
    ({
      txOut: {txHash, outputIndex, spentSlot, value: valueRaw},
      launch: {projectTokenPolicyId, projectTokenAssetName},
    }) => {
      const value = deserializeValue(valueRaw)

      return {
        txHash,
        outputIndex,
        rewards: value[projectTokenPolicyId]?.[projectTokenAssetName] ?? 0n,
        isSpent: spentSlot != null,
      }
    },
  )
}

// rewards can be unlocked using any of the available pool proofs (WR or Sundae)
export const getPoolProofInput = async (
  launchTxHash: string,
): Promise<TxInput | null> =>
  prisma.poolProof.findFirst({
    where: {
      launchTxHash,
      txOut: {spentSlot: null},
    },
    select: {
      txHash: true,
      outputIndex: true,
    },
  })

export const getFailProofInput = async (
  launchTxHash: string,
): Promise<TxInput | null> =>
  prisma.failProof.findFirst({
    where: {
      launchTxHash,
      txOut: {spentSlot: null},
    },
    select: {
      txHash: true,
      outputIndex: true,
    },
  })
