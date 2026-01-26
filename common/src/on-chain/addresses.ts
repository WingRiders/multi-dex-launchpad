import {
  buildBaseAddress,
  buildEnterpriseAddress,
  type Hash28ByteBase16,
  scriptHashToBech32,
} from '@meshsdk/core-cst'
import {getScriptFromExport} from '../helpers'
import {type Network, networkToNetworkId} from '../helpers/network'
import {failProofValidator, refScriptCarrierValidator} from './artifacts'

export const getFailProofValidatorAddress = (network: Network) => {
  const {hash} = getScriptFromExport(failProofValidator)
  return scriptHashToBech32(hash, undefined, networkToNetworkId[network])
}

export const getRefScriptCarrierValidatorAddress = (network: Network) => {
  const {hash} = getScriptFromExport(refScriptCarrierValidator)
  return scriptHashToBech32(hash, undefined, networkToNetworkId[network])
}

export const makeBech32Address = (
  network: Network,
  paymentKeyHash: string,
  stakeKeyHash?: string,
): string => {
  const networkId = networkToNetworkId[network]
  return (
    stakeKeyHash != null
      ? buildBaseAddress(
          networkId,
          paymentKeyHash as Hash28ByteBase16,
          stakeKeyHash,
        )
      : buildEnterpriseAddress(networkId, paymentKeyHash as Hash28ByteBase16)
  )
    .toAddress()
    .toBech32()
}
