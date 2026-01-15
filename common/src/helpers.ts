import {mConStr0} from '@meshsdk/common'
import {
  type Data,
  deserializeAddress,
  mPubKeyAddress,
  mScriptAddress,
  type TxInput,
} from '@meshsdk/core'
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
} from '@/constants'
import {applyParamsToScript} from '@/contract-generation/apply-params-to-script'
import {ensure} from './ensure'

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
  hex: string
  language: PlutusLanguageVersion
} = (plutusExport) => {
  const scriptCborHex = parseDatumCbor(plutusExport.cborHex).bytes
  const scriptCborBytes = Buffer.from(scriptCborHex, 'hex')

  return {
    hash: getScriptHash(
      scriptCborBytes,
      scriptTypeFromExportToScriptVersion(plutusExport.type),
    ),
    hex: scriptCborHex,
    language:
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
