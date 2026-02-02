import type {Utxo} from '@cardano-ogmios/schema'
import type {UTxO} from '@meshsdk/common'
import {ogmiosValueToMeshAssets} from '../../helpers'

export const ogmiosUtxoToMeshUtxo = (utxo: Utxo[number]): UTxO => ({
  input: {
    txHash: utxo.transaction.id,
    outputIndex: utxo.index,
  },
  output: {
    address: utxo.address,
    // TODO Move ogmiosValueToMeshAssets from helpers.ts to ogmios/helpers.ts
    amount: ogmiosValueToMeshAssets(utxo.value, {
      includeAda: true,
    }),
    dataHash: utxo.datumHash,
    plutusData: utxo.datum,
    // TODO scriptRef and scriptHash
  },
})
