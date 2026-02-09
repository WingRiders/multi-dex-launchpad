import {
  type MeshTxBuilder,
  MeshValue,
  SLOT_CONFIG_NETWORK,
  slotToBeginUnixTime,
  type Unit,
  type UTxO,
} from '@meshsdk/core'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  decodeDatum,
  type NodeDatum,
  nodeDatumCborSchema,
  nodeDatumToMeshData,
} from '../datums'
import {ensure} from '../ensure'
import {createUnit, LOVELACE_UNIT, networkToNetworkId} from '../helpers'
import type {LaunchConfig} from '../launch-configs'
import {nodeRedeemerToMeshData} from '../redeemers'
import type {RefSCriptUTxO} from '../types'

export type AddCreateCommitmentArgs = {
  config: Pick<LaunchConfig, 'nodeAda' | 'raisingToken'>
  committed: bigint
  lowerTimeLimitSlot: number
  upperTimeLimitSlot: number
  tier: {type: 'default'} | {type: 'presale'; unit: Unit}
  nodeToSpend: UTxO
  nodeValidatorRef: RefSCriptUTxO
  nodePolicyRef: RefSCriptUTxO
  firstProjectTokensHolderUTxO: UTxO
  ownerPubKeyHash: string
  ownerStakeKeyHash?: string
}

export const addCreateCommitment = (
  b: MeshTxBuilder,
  {
    config,
    committed,
    lowerTimeLimitSlot,
    upperTimeLimitSlot,
    tier,
    nodeToSpend,
    nodeValidatorRef,
    nodePolicyRef,
    firstProjectTokensHolderUTxO,
    ownerPubKeyHash,
    ownerStakeKeyHash,
  }: AddCreateCommitmentArgs,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  ensure(
    nodeToSpend.output.plutusData != null,
    'Node to spend is expected to have a datum',
  )

  const nodeToSpendDatum = decodeDatum(
    nodeDatumCborSchema,
    nodeToSpend.output.plutusData,
  )
  ensure(
    nodeToSpendDatum != null,
    'Failed to decode the datum of the node to spend',
  )

  const nodeValidityPolicyId = nodePolicyRef.output.scriptHash
  const nodeValidityAssetName = nodeValidatorRef.output.scriptHash

  const slotConfig = SLOT_CONFIG_NETWORK[network]

  b.readOnlyTxInReference(
    firstProjectTokensHolderUTxO.input.txHash,
    firstProjectTokensHolderUTxO.input.outputIndex,
    0,
  )
    .requiredSignerHash(ownerPubKeyHash)
    .invalidBefore(lowerTimeLimitSlot)
    // ttl of the transaction needs to be the same as the created time of the new node
    .invalidHereafter(upperTimeLimitSlot)

  // spend the previous node in the linked list
  b.spendingPlutusScriptV2()
    .txIn(
      nodeToSpend.input.txHash,
      nodeToSpend.input.outputIndex,
      nodeToSpend.output.amount,
      nodeToSpend.output.address,
      0,
    )
    .spendingTxInReference(
      nodeValidatorRef.input.txHash,
      nodeValidatorRef.input.outputIndex,
      nodeValidatorRef.scriptSize.toString(),
      nodeValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      nodeRedeemerToMeshData({
        type: 'insert-node',
        tier: tier.type,
      }),
    )

  // create a new node
  const newNodeDatum: NodeDatum = {
    key: {
      hash: ownerPubKeyHash,
      index:
        nodeToSpendDatum.key != null &&
        nodeToSpendDatum.key.hash === ownerPubKeyHash
          ? nodeToSpendDatum.key.index + 1
          : 0,
    },
    next: nodeToSpendDatum.next,
    createdTime: slotToBeginUnixTime(upperTimeLimitSlot, slotConfig),
    committed,
  }
  const newNodeValue = new MeshValue()
  newNodeValue.addAsset({
    unit: LOVELACE_UNIT,
    quantity: config.nodeAda.toString(),
  })
  newNodeValue.addAsset({
    unit: createUnit(nodeValidityPolicyId, nodeValidityAssetName),
    quantity: '1',
  })
  newNodeValue.addAsset({
    unit: config.raisingToken,
    quantity: committed.toString(),
  })

  b.txOut(
    scriptHashToBech32(
      nodeValidatorRef.output.scriptHash,
      ownerStakeKeyHash,
      networkToNetworkId[network],
    ),
    newNodeValue.toAssets(),
  ).txOutInlineDatumValue(nodeDatumToMeshData(newNodeDatum))

  // mint the node validity token
  b.mintPlutusScriptV2()
    .mint('1', nodeValidityPolicyId, nodeValidityAssetName)
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // recreate the spent node with the updated next key
  b.txOut(
    nodeToSpend.output.address,
    nodeToSpend.output.amount,
  ).txOutInlineDatumValue(
    nodeDatumToMeshData({
      ...nodeToSpendDatum,
      next: newNodeDatum.key,
    }),
  )

  return b
}
