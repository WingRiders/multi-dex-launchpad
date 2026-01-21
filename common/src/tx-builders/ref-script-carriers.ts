import type {MeshTxBuilder} from '@meshsdk/core'
import {
  type Contract,
  getRefScriptCarrierValidatorAddress,
  type Network,
  type RefScriptCarrierDatum,
  refScriptCarrierDatumToMeshData,
} from '..'

export const addRefScriptCarrier = (
  b: MeshTxBuilder,
  network: Network,
  refScriptCarrierDatum: RefScriptCarrierDatum,
  contract: Contract,
) =>
  b
    .txOut(getRefScriptCarrierValidatorAddress(network), [])
    .txOutInlineDatumValue(
      refScriptCarrierDatumToMeshData(refScriptCarrierDatum),
    )
    .txOutReferenceScript(contract.hex, contract.version)
