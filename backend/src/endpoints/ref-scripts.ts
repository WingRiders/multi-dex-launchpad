import {
  ensure,
  type RefScriptUtxo,
} from '@wingriders/multi-dex-launchpad-common'
import {
  RefScriptCarrierType,
  type TxOutput,
} from '../../prisma/generated/client'
import {prismaTxOutputToMeshOutput} from '../db/helpers'
import {prisma} from '../db/prisma-client'

export const txOutputToRefScriptUtxo = (txOutput: TxOutput): RefScriptUtxo => {
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
): Promise<RefScriptUtxo> => {
  const nodeValidatorRefScriptCarrier = await prisma.refScriptCarrier.findFirst(
    {
      where: {
        launchTxHash,
        type: RefScriptCarrierType.NODE_VALIDATOR,
        txOut: {spentSlot: null},
      },
      select: {txOut: true},
    },
  )

  if (nodeValidatorRefScriptCarrier == null) {
    throw new Error('Node validator ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(nodeValidatorRefScriptCarrier.txOut)
}

export const getNodePolicyRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefScriptUtxo> => {
  const nodePolicyRefScriptCarrier = await prisma.refScriptCarrier.findFirst({
    where: {
      launchTxHash,
      type: RefScriptCarrierType.NODE_POLICY,
      txOut: {spentSlot: null},
    },
    select: {txOut: true},
  })

  if (nodePolicyRefScriptCarrier == null) {
    throw new Error('Node policy ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier.txOut)
}

export const getFirstProjectTokensHolderValidatorRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefScriptUtxo> => {
  const firstProjectTokensHolderValidatorRefScriptCarrier =
    await prisma.refScriptCarrier.findFirst({
      where: {
        launchTxHash,
        type: RefScriptCarrierType.FIRST_PROJECT_TOKENS_HOLDER_VALIDATOR,
        txOut: {spentSlot: null},
      },
      select: {txOut: true},
    })

  if (firstProjectTokensHolderValidatorRefScriptCarrier == null) {
    throw new Error(
      'First project tokens holder validator ref script carrier not found',
    )
  }

  return txOutputToRefScriptUtxo(
    firstProjectTokensHolderValidatorRefScriptCarrier.txOut,
  )
}

export const getProjectTokensHolderPolicyRefScriptUtxo = async (
  launchTxHash: string,
): Promise<RefScriptUtxo> => {
  const projectTokensHolderPolicyRefScriptCarrier =
    await prisma.refScriptCarrier.findFirst({
      where: {
        launchTxHash,
        type: RefScriptCarrierType.PROJECT_TOKENS_HOLDER_POLICY,
        txOut: {spentSlot: null},
      },
      select: {txOut: true},
    })

  if (projectTokensHolderPolicyRefScriptCarrier == null) {
    throw new Error('Project tokens holder policy ref script carrier not found')
  }

  return txOutputToRefScriptUtxo(
    projectTokensHolderPolicyRefScriptCarrier.txOut,
  )
}
