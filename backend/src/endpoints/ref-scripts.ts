import {
  ensure,
  type RefSCriptUTxO,
} from '@wingriders/multi-dex-launchpad-common'
import type {TxOutput} from '../../prisma/generated/client'
import {prisma} from '../db/prisma-client'

const txOutputToRefScriptUtxo = (
  txOutput: Pick<
    TxOutput,
    'txHash' | 'outputIndex' | 'scriptHash' | 'scriptSize'
  >,
): RefSCriptUTxO => {
  ensure(
    txOutput.scriptHash != null && txOutput.scriptSize != null,
    {txOutput},
    'Script hash and size must be set',
  )

  return {
    txHash: txOutput.txHash,
    outputIndex: txOutput.outputIndex,
    scriptHash: txOutput.scriptHash,
    scriptSize: txOutput.scriptSize,
  }
}

export const getNodeValidatorRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefSCriptUTxO> => {
  const {nodeValidatorRefScriptCarrier} = await prisma.launch.findUniqueOrThrow(
    {
      where: {txHash: launchTxHash},
      select: {
        nodeValidatorRefScriptCarrier: {
          select: {
            txHash: true,
            outputIndex: true,
            scriptHash: true,
            scriptSize: true,
          },
        },
      },
    },
  )

  if (nodeValidatorRefScriptCarrier == null) {
    throw new Error('Node validator ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(nodeValidatorRefScriptCarrier)
}

export const getNodePolicyRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefSCriptUTxO> => {
  const {nodePolicyRefScriptCarrier} = await prisma.launch.findUniqueOrThrow({
    where: {txHash: launchTxHash},
    select: {
      nodePolicyRefScriptCarrier: {
        select: {
          txHash: true,
          outputIndex: true,
          scriptHash: true,
          scriptSize: true,
        },
      },
    },
  })

  if (nodePolicyRefScriptCarrier == null) {
    throw new Error('Node policy ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier)
}

export const getFirstProjectTokensHolderRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefSCriptUTxO> => {
  const {firstProjectTokensHolderValidatorRefScriptCarrier} =
    await prisma.launch.findUniqueOrThrow({
      where: {txHash: launchTxHash},
      select: {
        firstProjectTokensHolderValidatorRefScriptCarrier: {
          select: {
            txHash: true,
            outputIndex: true,
            scriptHash: true,
            scriptSize: true,
          },
        },
      },
    })

  if (firstProjectTokensHolderValidatorRefScriptCarrier == null) {
    throw new Error('First project tokens holder ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(
    firstProjectTokensHolderValidatorRefScriptCarrier,
  )
}
