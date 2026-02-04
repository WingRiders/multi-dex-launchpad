import type {Plutus} from '@cardano-ogmios/schema'
import {applyCborEncoding, resolveScriptHash} from '@meshsdk/core'
import {ogmiosPlutusVersionToMeshVersion} from '../agent/ogmios/helpers'

/**
 * Encodes a plutus script that is stored on an Ogmios UTxO so that it's ready to be used in a transaction with Mesh SDK.
 */
export const encodeOgmiosScript = (
  language: Plutus['language'],
  cbor: string,
) => {
  const encodedScript = applyCborEncoding(cbor)
  const scriptVersion = ogmiosPlutusVersionToMeshVersion[language]
  const scriptHash = resolveScriptHash(encodedScript, scriptVersion)

  const versionNumber = {
    V1: '01',
    V2: '02',
    V3: '03',
  }[scriptVersion]

  // wrap the encoded script in a CBOR array of 2 elements (tag 82) with the version number
  const scriptRef = `82${versionNumber}${encodedScript}`

  return {scriptHash, scriptRef}
}
