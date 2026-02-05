import type {UTxO} from '@meshsdk/common'
import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {prismaTxOutputToMeshOutput} from '../db/helpers'
import {prisma} from '../db/prisma-client'

export const getUserNodes = async (
  launchTxHash: string,
  ownerPubKeyHash: string,
) => {
  const nodes = await prisma.node.findMany({
    where: {
      keyHash: ownerPubKeyHash,
      launchTxHash,
      txOut: {
        spentSlot: null,
      },
    },
    select: {
      txHash: true,
      outputIndex: true,
      keyHash: true,
      keyIndex: true,
      committed: true,
      createdTime: true,
    },
    orderBy: {
      keyIndex: 'asc',
    },
  })

  return nodes.map(
    ({txHash, outputIndex, keyHash, keyIndex, committed, createdTime}) => {
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

      return {
        txHash,
        outputIndex,
        keyHash,
        keyIndex,
        committed,
        createdTime: new Date(Number(createdTime)),
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
