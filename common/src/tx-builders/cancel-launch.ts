import type {MeshTxBuilder, UTxO} from '@meshsdk/core'

import {ensure} from '../ensure'
import {tokensHolderFirstRedeemerToMeshData} from '../redeemers'
import type {RefScriptUtxo} from '../types'

export type AddCancelLaunchArgs = {
  tokensHolderFirstUTxO: UTxO
  tokensHolderFirstValidatorRef: RefScriptUtxo
  tokensHolderPolicyRef: RefScriptUtxo
  ownerPubKeyHash: string
  lowerTimeLimitSlot: number
  upperTimeLimitSlot: number
}

export const addCancelLaunch = (
  b: MeshTxBuilder,
  {
    tokensHolderFirstUTxO,
    tokensHolderFirstValidatorRef,
    tokensHolderPolicyRef,
    ownerPubKeyHash,
    lowerTimeLimitSlot,
    upperTimeLimitSlot,
  }: AddCancelLaunchArgs,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  b.requiredSignerHash(ownerPubKeyHash)
    .invalidBefore(lowerTimeLimitSlot)
    .invalidHereafter(upperTimeLimitSlot)

  // spend the tokens holder first utxo
  b.spendingPlutusScriptV2()
    .txIn(
      tokensHolderFirstUTxO.input.txHash,
      tokensHolderFirstUTxO.input.outputIndex,
      tokensHolderFirstUTxO.output.amount,
      tokensHolderFirstUTxO.output.address,
      0,
    )
    .spendingTxInReference(
      tokensHolderFirstValidatorRef.input.txHash,
      tokensHolderFirstValidatorRef.input.outputIndex,
      tokensHolderFirstValidatorRef.scriptSize.toString(),
      tokensHolderFirstValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(tokensHolderFirstRedeemerToMeshData('cancel-launch'))

  // burn the tokens holder validity token
  b.mintPlutusScriptV2()
    .mint(
      '-1',
      tokensHolderPolicyRef.output.scriptHash,
      tokensHolderFirstValidatorRef.output.scriptHash,
    )
    .mintTxInReference(
      tokensHolderPolicyRef.input.txHash,
      tokensHolderPolicyRef.input.outputIndex,
      tokensHolderPolicyRef.scriptSize.toString(),
      tokensHolderPolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  return b
}
