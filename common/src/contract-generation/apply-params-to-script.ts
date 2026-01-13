import type {Data} from '@meshsdk/core'
import {parseDatumCbor, toPlutusData} from '@meshsdk/core-cst'
import {applyParamsToScript as applyParamsToScriptLib} from '@wingriders/apply-params-to-script'
import type {PlutusScriptVersion} from '@/constants'
import {getScriptHash} from '@/helpers'

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
