import {type Data, resolveScriptHash} from '@meshsdk/core'
import {
  PLUTUS_SCRIPT_VERSION_PREFIX,
  PLUTUS_SCRIPT_VERSION_TO_LANGUAGE,
  type PlutusScriptVersion,
} from '../constants'
import {applyParamsToScript} from '../contract-generation/apply-params-to-script'
import {ensure} from '../ensure'
import type {Contract} from '../on-chain/types'

export const getScriptFromExport = (plutusExport: {
  cborHex: string
  type: string
}): Contract => {
  const hex = plutusExport.cborHex
  const version =
    PLUTUS_SCRIPT_VERSION_TO_LANGUAGE[plutusExport.type as PlutusScriptVersion]
  const hash = resolveScriptHash(hex, version)
  return {hash, hex, version}
}

export const applyParamsToScriptExport = async (
  script: {cborHex: string; type: string},
  params: Data[],
) =>
  applyParamsToScript(
    {
      cborHex: script.cborHex,
      version: scriptTypeFromExportToScriptVersion(script.type),
    },
    params,
  )

const scriptTypeFromExportToScriptVersion = (
  type: string,
): PlutusScriptVersion => {
  ensure(
    type in PLUTUS_SCRIPT_VERSION_PREFIX,
    {type},
    'Incorrect plutus script version',
  )
  return type as PlutusScriptVersion
}
