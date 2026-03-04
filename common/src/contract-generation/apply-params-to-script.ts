import {
  applyParamsToScript as applyParamsToScriptLib,
  type Data,
  resolveScriptHash,
} from '@meshsdk/core'
import {
  PLUTUS_SCRIPT_VERSION_TO_LANGUAGE,
  type PlutusScriptVersion,
} from '../constants'
import type {Contract} from '../on-chain/types'

export const applyParamsToScript = (
  script: {cborHex: string; version: PlutusScriptVersion},
  params: Data[],
): Contract => {
  const hex = applyParamsToScriptLib(script.cborHex, params)
  const version = PLUTUS_SCRIPT_VERSION_TO_LANGUAGE[script.version]
  const hash = resolveScriptHash(hex, version)
  return {hex, hash, version}
}
