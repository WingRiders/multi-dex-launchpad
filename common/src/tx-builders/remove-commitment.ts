import type {MeshTxBuilder, UTxO} from '@meshsdk/core'
import {decodeDatum, nodeDatumCborSchema, nodeDatumToMeshData} from '../datums'
import {ensure} from '../ensure'
import {nodeRedeemerToMeshData} from '../redeemers'
import type {RefScriptUtxo} from '../types'

export type AddRemoveCommitmentArgs = {
  nodeUtxoToRemove: UTxO
  previousNodeUtxo: UTxO
  nodeValidatorRef: RefScriptUtxo
  nodePolicyRef: RefScriptUtxo
  ownerPubKeyHash: string
  lowerTimeLimitSlot: number
  upperTimeLimitSlot: number
}

export const addRemoveCommitment = (
  b: MeshTxBuilder,
  {
    nodeUtxoToRemove,
    previousNodeUtxo,
    nodeValidatorRef,
    nodePolicyRef,
    ownerPubKeyHash,
    lowerTimeLimitSlot,
    upperTimeLimitSlot,
  }: AddRemoveCommitmentArgs,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  const nodeValidityPolicyId = nodePolicyRef.output.scriptHash
  const nodeValidityAssetName = nodeValidatorRef.output.scriptHash

  ensure(
    nodeUtxoToRemove.output.plutusData != null,
    'Node to remove is expected to have a datum',
  )
  ensure(
    previousNodeUtxo.output.plutusData != null,
    'Previous node is expected to have a datum',
  )

  b.requiredSignerHash(ownerPubKeyHash)
    .invalidBefore(lowerTimeLimitSlot)
    .invalidHereafter(upperTimeLimitSlot)

  // spend the node to remove
  b.spendingPlutusScriptV2()
    .txIn(
      nodeUtxoToRemove.input.txHash,
      nodeUtxoToRemove.input.outputIndex,
      nodeUtxoToRemove.output.amount,
      nodeUtxoToRemove.output.address,
      0,
    )
    .spendingTxInReference(
      nodeValidatorRef.input.txHash,
      nodeValidatorRef.input.outputIndex,
      nodeValidatorRef.scriptSize.toString(),
      nodeValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(nodeRedeemerToMeshData({type: 'remove-current-node'}))

  // spend the previous node
  b.spendingPlutusScriptV2()
    .txIn(
      previousNodeUtxo.input.txHash,
      previousNodeUtxo.input.outputIndex,
      previousNodeUtxo.output.amount,
      previousNodeUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      nodeValidatorRef.input.txHash,
      nodeValidatorRef.input.outputIndex,
      nodeValidatorRef.scriptSize.toString(),
      nodeValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(nodeRedeemerToMeshData({type: 'remove-next-node'}))

  // burn the node validity token
  b.mintPlutusScriptV2()
    .mint('-1', nodeValidityPolicyId, nodeValidityAssetName)
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // recreate the previous node with the updated next key
  const nodeToRemoveDatum = decodeDatum(
    nodeDatumCborSchema,
    nodeUtxoToRemove.output.plutusData,
  )
  ensure(
    nodeToRemoveDatum != null,
    'Failed to decode the datum of the node to remove',
  )
  const previousNodeDatum = decodeDatum(
    nodeDatumCborSchema,
    previousNodeUtxo.output.plutusData,
  )
  ensure(
    previousNodeDatum != null,
    'Failed to decode the datum of the previous node',
  )
  b.txOut(
    previousNodeUtxo.output.address,
    previousNodeUtxo.output.amount,
  ).txOutInlineDatumValue(
    nodeDatumToMeshData({
      ...previousNodeDatum,
      next: nodeToRemoveDatum.next,
    }),
  )

  return b
}
