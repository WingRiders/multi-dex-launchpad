import type {TxInParameter, UTxO} from '@meshsdk/common'
import {LOVELACE_UNIT} from './unit'

export const matchUtxo = (input1: UTxO['input']) => (input2: UTxO['input']) =>
  input1.txHash === input2.txHash && input1.outputIndex === input2.outputIndex

export const getUtxoId = (utxo: UTxO): string =>
  `${utxo.input.txHash}${utxo.input.outputIndex}`

export const getTxInParameterUtxoId = (txIn: TxInParameter) =>
  `${txIn.txHash}${txIn.txIndex}`

export const sortUtxos = (utxos: UTxO[]) =>
  utxos.toSorted((a, b) => {
    if (a.input.txHash < b.input.txHash) return -1
    if (a.input.txHash > b.input.txHash) return 1
    return a.input.outputIndex - b.input.outputIndex
  })

export const getUtxoAda = (utxo: UTxO) =>
  Number(
    utxo.output.amount.find(({unit}) => unit === LOVELACE_UNIT)?.quantity ??
      '0',
  )
