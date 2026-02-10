import type {MeshTxBuilder, TxInput, UTxO} from '@meshsdk/core'
import {ensure} from '../ensure'
import {nodeRedeemerToMeshData} from '../redeemers'
import type {RefSCriptUTxO} from '../types'

export type AddReclaimCommitmentsArgs = {
  nodeUtxos: UTxO[]
  nodeValidatorRef: RefSCriptUTxO
  nodePolicyRef: RefSCriptUTxO
  failProofInput: TxInput
  lowerTimeLimitSlot: number
  upperTimeLimitSlot: number
  ownerPubKeyHash: string
}

export const addReclaimCommitments = (
  b: MeshTxBuilder,
  {
    nodeUtxos,
    nodeValidatorRef,
    nodePolicyRef,
    failProofInput,
    lowerTimeLimitSlot,
    upperTimeLimitSlot,
    ownerPubKeyHash,
  }: AddReclaimCommitmentsArgs,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  b.readOnlyTxInReference(failProofInput.txHash, failProofInput.outputIndex, 0)
    .requiredSignerHash(ownerPubKeyHash)
    .invalidBefore(lowerTimeLimitSlot)
    .invalidHereafter(upperTimeLimitSlot)

  for (const nodeUtxo of nodeUtxos) {
    b.spendingPlutusScriptV2()
      .txIn(
        nodeUtxo.input.txHash,
        nodeUtxo.input.outputIndex,
        nodeUtxo.output.amount,
        nodeUtxo.output.address,
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
          type: 'reclaim-after-failure',
        }),
      )
  }

  // burn the node validity tokens
  b.mintPlutusScriptV2()
    .mint(
      (-nodeUtxos.length).toString(),
      nodePolicyRef.output.scriptHash,
      nodeValidatorRef.output.scriptHash,
    )
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  return b
}
