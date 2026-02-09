import {
  SLOT_CONFIG_NETWORK,
  type UTxO,
  unixTimeToEnclosingSlot,
} from '@meshsdk/common'
import type {
  LaunchConfig,
  LaunchTimeStatus,
  ProjectInfoTxMetadata,
} from '@wingriders/multi-dex-launchpad-common'
import {max} from 'es-toolkit/compat'
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
  config: LaunchConfig
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
  const firstProjectTokensHolder =
    // Gets the most recent first project tokens holder utxo
    await prisma.firstProjectTokensHolder.findFirst({
      select: {txOut: true},
      where: {launchTxHash, txOut: {spentSlot: {not: null}}},
    })

  if (firstProjectTokensHolder == null) {
    throw new Error(
      `First project tokens holder not found for launch ${launchTxHash}`,
    )
  }

  return prismaTxOutputToMeshOutput(firstProjectTokensHolder.txOut)
}
