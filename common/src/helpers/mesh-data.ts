import {mConStr0, mConStr1, type TxInput} from '@meshsdk/common'
import {
  type Data,
  deserializeAddress,
  mPubKeyAddress,
  mScriptAddress,
} from '@meshsdk/core'

export const bech32AddressToMeshData = (address: string): Data => {
  const deserializedAddress = deserializeAddress(address)
  const [stakeCredential, isStakeScriptCredential] =
    deserializedAddress.stakeCredentialHash != null
      ? [deserializedAddress.stakeCredentialHash, false]
      : [deserializedAddress.stakeScriptCredentialHash, true]
  if (deserializedAddress.pubKeyHash) {
    return mPubKeyAddress(
      deserializedAddress.pubKeyHash,
      stakeCredential,
      isStakeScriptCredential,
    )
  }
  return mScriptAddress(
    deserializedAddress.scriptHash,
    stakeCredential,
    isStakeScriptCredential,
  )
}

export const txInputToMeshData = ({txHash, outputIndex}: TxInput): Data =>
  mConStr0([mConStr0([txHash]), outputIndex])

export const maybeToMeshData = <T>(
  value: T | null,
  toMeshData: (v: T) => Data,
) => (value != null ? mConStr0([toMeshData(value)]) : mConStr1([]))
