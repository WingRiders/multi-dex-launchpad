import type {Data} from '@meshsdk/core'
import {blake2b, HexBlob, parseDatumCbor} from '@meshsdk/core-cst'
import {
  PLUTUS_SCRIPT_VERSION_PREFIX,
  PLUTUS_SCRIPT_VERSION_TO_LANGUAGE,
  type PlutusScriptVersion,
  SCRIPT_HASH_LENGTH,
} from '../constants'
import {applyParamsToScript} from '../contract-generation/apply-params-to-script'
import {ensure} from '../ensure'
import type {Contract} from '../on-chain/types'

export const getScriptHash = (
  scriptBytes: Uint8Array,
  version: PlutusScriptVersion,
): string => {
  const versionPrefix = Buffer.from(
    PLUTUS_SCRIPT_VERSION_PREFIX[version],
    'hex',
  )
  return blake2b.hash(
    HexBlob.fromBytes(Buffer.concat([versionPrefix, scriptBytes])),
    SCRIPT_HASH_LENGTH,
  )
}

export const getScriptFromExport = (plutusExport: {
  cborHex: string
  type: string
}): Contract => {
  const scriptCborHex = parseDatumCbor(plutusExport.cborHex).bytes
  const scriptCborBytes = Buffer.from(scriptCborHex, 'hex')

  return {
    hash: getScriptHash(
      scriptCborBytes,
      scriptTypeFromExportToScriptVersion(plutusExport.type),
    ),
    hex: scriptCborHex,
    version:
      PLUTUS_SCRIPT_VERSION_TO_LANGUAGE[
        plutusExport.type as PlutusScriptVersion
      ],
  }
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
