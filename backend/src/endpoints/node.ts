import {
  SLOT_CONFIG_NETWORK,
  type UTxO,
  unixTimeToEnclosingSlot,
} from '@meshsdk/common'
import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {calculateCutoff, getOverCommittedQuantity} from '../agent/cutoff'
import {config} from '../config'
import {prismaTxOutputToMeshOutput} from '../db/helpers'
import {prisma} from '../db/prisma-client'

export const getUserNodes = async (
  launchTxHash: string,
  ownerPubKeyHash: string,
) => {
  const launch = await prisma.launch.findUniqueOrThrow({
    where: {
      txHash: launchTxHash,
    },
    select: {
      endTime: true,
    },
  })

  const launchEndSlot = unixTimeToEnclosingSlot(
    Number(launch.endTime),
    SLOT_CONFIG_NETWORK[config.NETWORK],
  )

  const userNodes = await prisma.node.findMany({
    where: {
      keyHash: ownerPubKeyHash,
      launchTxHash,
      txOut: {
        OR: [
          {spentSlot: null},
          // we want to include nodes that were spent after the launch ended (either reclaimed or folded)
          {spentSlot: {gt: launchEndSlot}},
        ],
      },
    },
    select: {
      txHash: true,
      outputIndex: true,
      keyHash: true,
      keyIndex: true,
      committed: true,
      createdTime: true,
      txOut: {
        select: {
          spentSlot: true,
        },
      },
    },
    orderBy: {
      keyIndex: 'asc',
    },
  })

  const launchWithAllUserNodes = await prisma.launch.findFirstOrThrow({
    where: {
      txHash: launchTxHash,
    },
    select: {
      projectMaxCommitment: true,
      nodes: {
        select: {
          keyHash: true,
          keyIndex: true,
          createdTime: true,
          committed: true,
        },
        where: {
          txOut: {
            OR: [
              {spentSlot: null},
              // we want to include nodes that were spent after the launch ended (either reclaimed or folded)
              {spentSlot: {gt: launchEndSlot}},
            ],
          },
          // exclude separators
          committed: {gt: 0n},
          // exclude head node
          keyHash: {not: null},
          keyIndex: {not: null},
        },
      },
    },
  })

  const cutoff = calculateCutoff({
    projectMaxCommitment: launchWithAllUserNodes.projectMaxCommitment,
    usersNodes: launchWithAllUserNodes.nodes.map((node) => {
      const keyHash = node.keyHash
      const keyIndex = node.keyIndex
      ensure(keyHash != null, {node}, 'Found user node with null key hash')
      ensure(keyIndex != null, {node}, 'Found user node with null key index')

      return {...node, keyHash, keyIndex}
    }),
  })

  return userNodes.map(
    ({
      txHash,
      outputIndex,
      keyHash,
      keyIndex,
      committed,
      createdTime: createdTimeBigInt,
      txOut: {spentSlot},
    }) => {
      ensure(
        keyHash != null,
        {txHash, outputIndex},
        'Found user node with null key hash',
      )
      ensure(
        keyIndex != null,
        {txHash, outputIndex},
        'Found user node with null key index',
      )

      const createdTime = Number(createdTimeBigInt)

      const overCommitted = cutoff
        ? getOverCommittedQuantity(cutoff, {
            nodeKey: {
              hash: keyHash,
              index: keyIndex,
            },
            createdTime,
            committed,
          })
        : 0n

      return {
        txHash,
        outputIndex,
        keyHash,
        keyIndex,
        committed,
        overCommitted,
        createdTime: new Date(createdTime),
        isSpent: spentSlot != null,
      }
    },
  )
}

export const getPreviousNodeUTxO = async (
  launchTxHash: string,
  keyHash: string,
  keyIndex: number,
): Promise<UTxO> => {
  const previousNode = await prisma.node.findFirst({
    where: {
      launchTxHash,
      nextHash: keyHash,
      nextIndex: keyIndex,
      txOut: {
        spentSlot: null,
      },
    },
    include: {
      txOut: true,
    },
  })

  if (!previousNode) {
    throw new Error(
      `Previous node not found for keyHash ${keyHash} and keyIndex ${keyIndex}`,
    )
  }
  return prismaTxOutputToMeshOutput(previousNode.txOut)
}
