import {
  ensure,
  type RefSCriptUTxO,
} from '@wingriders/multi-dex-launchpad-common'
import type {TxOutput} from '../../prisma/generated/client'
import {prismaTxOutputToMeshOutput} from '../db/helpers'
import {prisma} from '../db/prisma-client'

const txOutputToRefScriptUtxo = (txOutput: TxOutput): RefSCriptUTxO => {
  const utxo = prismaTxOutputToMeshOutput(txOutput)

  const scriptRef = utxo.output.scriptRef
  const scriptHash = utxo.output.scriptHash

  ensure(scriptRef != null, {txOutput}, 'Script ref is required')
  ensure(scriptHash != null, {txOutput}, 'Script hash is required')

  const scriptSize = scriptRef.length / 2

  return {
    input: utxo.input,
    output: {
      ...utxo.output,
      scriptRef,
      scriptHash,
    },
    scriptSize,
  }
}

export const getNodeValidatorRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefSCriptUTxO> => {
  const {nodeValidatorRefScriptCarrier} = await prisma.launch.findUniqueOrThrow(
    {
      where: {txHash: launchTxHash},
      select: {
        nodeValidatorRefScriptCarrier: true,
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
      nodePolicyRefScriptCarrier: true,
    },
  })

  if (nodePolicyRefScriptCarrier == null) {
    throw new Error('Node policy ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier)
}

export const getFirstProjectTokensHolderValidatorRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefSCriptUTxO> => {
  const {firstProjectTokensHolderValidatorRefScriptCarrier} =
    await prisma.launch.findUniqueOrThrow({
      where: {txHash: launchTxHash},
      select: {
        firstProjectTokensHolderValidatorRefScriptCarrier: true,
      },
    })

  if (firstProjectTokensHolderValidatorRefScriptCarrier == null) {
    throw new Error(
      'First project tokens holder validator ref script carrier not found',
    )
  }

  return txOutputToRefScriptUtxo(
    firstProjectTokensHolderValidatorRefScriptCarrier,
  )
}

export const getProjectTokensHolderPolicyRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefSCriptUTxO> => {
  const {projectTokensHolderPolicyRefScriptCarrier} =
    await prisma.launch.findUniqueOrThrow({
      where: {txHash: launchTxHash},
      select: {
        projectTokensHolderPolicyRefScriptCarrier: true,
      },
    })

  if (projectTokensHolderPolicyRefScriptCarrier == null) {
    throw new Error('Project tokens holder policy ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(projectTokensHolderPolicyRefScriptCarrier)
}
