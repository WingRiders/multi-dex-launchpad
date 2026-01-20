import type {Network} from '@meshsdk/core'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {getScriptFromExport} from '../helpers'
import {failProofValidator, refScriptCarrierValidator} from './artifacts'
import {networkToNetworkId} from './types'

export const getFailProofValidatorAddress = (network: Network) => {
  const {hash} = getScriptFromExport(failProofValidator)
  return scriptHashToBech32(hash, undefined, networkToNetworkId[network])
}

export const getRefScriptCarrierValidatorAddress = (network: Network) => {
  const {hash} = getScriptFromExport(refScriptCarrierValidator)
  return scriptHashToBech32(hash, undefined, networkToNetworkId[network])
}
