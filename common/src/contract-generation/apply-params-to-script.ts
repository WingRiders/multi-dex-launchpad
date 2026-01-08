import type {Data} from '@meshsdk/core'
import {blake2b, HexBlob, parseDatumCbor, toPlutusData} from '@meshsdk/core-cst'
import {applyParamsToScript as applyParamsToScriptLib} from '@wingriders/apply-params-to-script'

const SCRIPT_HASH_LENGTH = 28

export enum PlutusScriptVersion {
  PlutusScriptV1 = 'PlutusScriptV1',
  PlutusScriptV2 = 'PlutusScriptV2',
  PlutusScriptV3 = 'PlutusScriptV3',
}

const PLUTUS_SCRIPT_VERSION_PREFIX = {
  [PlutusScriptVersion.PlutusScriptV1]: '01',
  [PlutusScriptVersion.PlutusScriptV2]: '02',
  [PlutusScriptVersion.PlutusScriptV3]: '03',
}

const getScriptHash = (
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

export const applyParamsToScript = async (
  script: {cborHex: string; version: PlutusScriptVersion},
  params: Data[],
) => {
  const paramsCborHex = toPlutusData(params).toCbor()
  const paramsCborBytes = Buffer.from(paramsCborHex, 'hex')
  const scriptCborBytes = Buffer.from(
    parseDatumCbor(script.cborHex).bytes,
    'hex',
  )
  const parametrizedScriptBytes = await applyParamsToScriptLib(
    paramsCborBytes,
    scriptCborBytes,
  )
  const hash = getScriptHash(parametrizedScriptBytes, script.version)

  return {
    hex: parametrizedScriptBytes.toHex(),
    hash,
  }
}
