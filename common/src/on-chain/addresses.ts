import {
  buildBaseAddress,
  buildEnterpriseAddress,
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
  if (stakeKeyHash != null)
    return buildBaseAddress(networkId, paymentKeyHash, stakeKeyHash)
      .toAddress()
      .toBech32()
  else
    return buildEnterpriseAddress(networkId, paymentKeyHash)
      .toAddress()
      .toBech32()
}
