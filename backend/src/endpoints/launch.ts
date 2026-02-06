import {
  SLOT_CONFIG_NETWORK,
  type UTxO,
  unixTimeToEnclosingSlot,
} from '@meshsdk/common'
import type {
  LaunchpadConfig,
  LaunchTimeStatus,
  ProjectInfoTxMetadata,
} from '@wingriders/multi-dex-launchpad-common'
import type {Prisma} from '../../prisma/generated/client'
import {config} from '../config'
import {
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

  const launches = await prisma.launch.findMany({
    where,
    select: {
      txHash: true,
      projectTitle: true,
      projectDescription: true,
      projectLogoUrl: true,
      startTime: true,
      endTime: true,
      firstProjectTokensHolder: {
        select: {
          spentSlot: true,
        },
      },
    },
  })

  return (
    launches
      // filter out cancelled launches
      .filter(
        ({startTime, firstProjectTokensHolder}) =>
          !isLaunchCancelled(
            Number(startTime),
            firstProjectTokensHolder?.spentSlot,
          ),
      )
      .map(
        ({
          txHash,
          projectTitle,
          projectDescription,
          projectLogoUrl,
          startTime,
          endTime,
        }) => ({
          txHash,
          title: projectTitle,
          description: projectDescription,
          logoIpfsUrl: projectLogoUrl,
          startTime: new Date(Number(startTime)),
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
  firstTokensHolderSpentSlot <
    unixTimeToEnclosingSlot(startTime, SLOT_CONFIG_NETWORK[config.NETWORK])

export const getLaunch = async (
  txHash: string,
): Promise<{
  projectInfo: ProjectInfoTxMetadata
  config: LaunchpadConfig
  totalCommitted: bigint
}> => {
  const launch = await prisma.launch.findUnique({
    where: {
      txHash,
    },
  })

  if (!launch) {
    throw new Error(`Launch with txHash ${txHash} not found`)
  }

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
    totalCommitted: 0n, // TODO: sum up the total committed amount
  }
}

export const getFirstProjectTokensHolderUTxO = async (
  launchTxHash: string,
): Promise<UTxO> => {
  const {firstProjectTokensHolder} = await prisma.launch.findUniqueOrThrow({
    where: {
      txHash: launchTxHash,
    },
    select: {
      firstProjectTokensHolder: true,
    },
  })

  if (firstProjectTokensHolder == null) {
    throw new Error(
      `First project tokens holder not found for launch ${launchTxHash}`,
    )
  }

  return prismaTxOutputToMeshOutput(firstProjectTokensHolder)
}
