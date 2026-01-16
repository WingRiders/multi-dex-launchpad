import type {Network} from '@meshsdk/core'
import {type NetworkId, scriptHashToBech32} from '@meshsdk/core-cst'
import {getScriptFromExport} from '../helpers/script'
import {failProofValidator as failProofValidatorExport} from './artifacts'

export const failProofValidatorAddress = (network: Network) => {
  const networkId: NetworkId = network === 'mainnet' ? 1 : 0
  const {hash} = getScriptFromExport(failProofValidatorExport)
  return scriptHashToBech32(hash, undefined, networkId)
}
