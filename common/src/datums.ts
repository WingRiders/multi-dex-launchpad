import {mConStr0} from '@meshsdk/common'

export type RefScriptCarrierDatum = {
  ownerPubKeyHash: string
  // POSIXTime
  deadline: number
}

export const refScriptCarrierDatumToMeshData = (datum: RefScriptCarrierDatum) =>
  mConStr0([datum.ownerPubKeyHash, datum.deadline])
