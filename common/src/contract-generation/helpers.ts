import {
  blake2b,
  HexBlob,
  type PlutusLanguageVersion,
  parseDatumCbor,
} from '@meshsdk/core-cst'
import {
  PLUTUS_SCRIPT_VERSION_PREFIX,
  PLUTUS_SCRIPT_VERSION_TO_LANGUAGE,
  type PlutusScriptVersion,
  SCRIPT_HASH_LENGTH,
} from '@/contract-generation/constants'

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

export const getScriptFromExport: (plutusExport: {
  cborHex: string
  type: string
}) => {
  hash: string
  bytes: Buffer
  language: PlutusLanguageVersion
} = (plutusExport) => {
  const scriptCborBytes = Buffer.from(
    parseDatumCbor(plutusExport.cborHex).bytes,
    'hex',
  )

  return {
    hash: getScriptHash(
      scriptCborBytes,
      scriptTypeFromExportToScriptVersion(plutusExport.type),
    ),
    bytes: scriptCborBytes,
    language:
      PLUTUS_SCRIPT_VERSION_TO_LANGUAGE[
        plutusExport.type as PlutusScriptVersion
      ],
  }
}

const scriptTypeFromExportToScriptVersion = (
  type: string,
): PlutusScriptVersion => {
  if (!(type in PLUTUS_SCRIPT_VERSION_PREFIX)) {
    throw new Error(`Incorrect plutus script version: ${type}`)
  }
  return type as PlutusScriptVersion
}
