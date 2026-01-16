import type {Data} from '@meshsdk/core'
import {parseDatumCbor, toPlutusData} from '@meshsdk/core-cst'
import {applyParamsToScript as applyParamsToScriptLib} from '@wingriders/apply-params-to-script'
import {
  PLUTUS_SCRIPT_VERSION_TO_LANGUAGE,
  type PlutusScriptVersion,
} from '../constants'
import {getScriptHash} from '../helpers/script'
import type {Contract} from '../on-chain/types'

export const applyParamsToScript = async (
  script: {cborHex: string; version: PlutusScriptVersion},
  params: Data[],
): Promise<Contract> => {
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
    version: PLUTUS_SCRIPT_VERSION_TO_LANGUAGE[script.version],
  }
}
