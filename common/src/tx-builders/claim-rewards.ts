import type {MeshTxBuilder, TxInput, UTxO} from '@meshsdk/core'
import {ensure} from '../ensure'
import {constantRefScriptsByNetwork} from '../ref-scripts/ref-scripts'

export type AddClaimRewardsArgs = {
  rewardsHolderUtxos: UTxO[]
  poolProofInput: TxInput
  lowerTimeLimitSlot: number
  upperTimeLimitSlot: number
  ownerPubKeyHash: string
}

export const addClaimRewards = (
  b: MeshTxBuilder,
  {
    rewardsHolderUtxos,
    poolProofInput,
    lowerTimeLimitSlot,
    upperTimeLimitSlot,
    ownerPubKeyHash,
  }: AddClaimRewardsArgs,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  const rewardsHolderValidatorRef =
    constantRefScriptsByNetwork[network].rewardsHolderValidator

  b.readOnlyTxInReference(poolProofInput.txHash, poolProofInput.outputIndex, 0)
    .requiredSignerHash(ownerPubKeyHash)
    .invalidBefore(lowerTimeLimitSlot)
    .invalidHereafter(upperTimeLimitSlot)

  for (const rewardsHolderUtxo of rewardsHolderUtxos) {
    b.spendingPlutusScriptV2()
      .txIn(
        rewardsHolderUtxo.input.txHash,
        rewardsHolderUtxo.input.outputIndex,
        rewardsHolderUtxo.output.amount,
        rewardsHolderUtxo.output.address,
        0,
      )
      .spendingTxInReference(
        rewardsHolderValidatorRef.input.txHash,
        rewardsHolderValidatorRef.input.outputIndex,
        rewardsHolderValidatorRef.scriptSize.toString(),
        rewardsHolderValidatorRef.output.scriptHash,
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue([])
  }

  return b
}
