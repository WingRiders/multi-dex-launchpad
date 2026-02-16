import {prisma} from './prisma-client'

export const getUnspentNodes = (launchTxHash: string, unspentAtSlot?: number) =>
  prisma.node.findMany({
    where: {
      launchTxHash,
      txOut: {
        ...(unspentAtSlot
          ? {
              OR: [
                {
                  spentSlot: null,
                },
                {
                  spentSlot: {
                    gt: unspentAtSlot,
                  },
                },
              ],
            }
          : {spentSlot: null}),
      },
    },
    include: {
      txOut: true,
    },
    orderBy: [
      {
        keyHash: {sort: 'asc', nulls: 'first'},
      },
      {
        keyIndex: {sort: 'asc', nulls: 'first'},
      },
    ],
  })
