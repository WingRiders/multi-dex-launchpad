import type {UTxO} from '@meshsdk/common'
import {prismaTxOutputToMeshOutput} from '../db/helpers'
import {prisma} from '../db/prisma-client'

export const getUTxO = async (
  txHash: string,
  outputIndex: number,
): Promise<UTxO> => {
  const txOutput = await prisma.txOutput.findUnique({
    where: {
      txHash_outputIndex: {
        txHash,
        outputIndex,
      },
      spentSlot: null,
    },
  })
  if (!txOutput) {
    throw new Error(
      `UTxO with txHash ${txHash} and outputIndex ${outputIndex} not found`,
    )
  }
  return prismaTxOutputToMeshOutput(txOutput)
}

export const getUtxos = async (
  inputs: {txHash: string; outputIndex: number}[],
): Promise<UTxO[]> => {
  const txOutputs = await prisma.txOutput.findMany({
    where: {
      OR: inputs.map((input) => ({
        txHash: input.txHash,
        outputIndex: input.outputIndex,
      })),
      spentSlot: null,
    },
  })
  return txOutputs.map(prismaTxOutputToMeshOutput)
}
