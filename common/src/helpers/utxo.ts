import type {TxInParameter, UTxO} from '@meshsdk/common'

export const matchUtxo = (input1: UTxO['input']) => (input2: UTxO['input']) =>
  input1.txHash === input2.txHash && input1.outputIndex === input2.outputIndex

export const getUtxoId = (utxo: UTxO): string =>
  `${utxo.input.txHash}${utxo.input.outputIndex}`

export const getTxInParameterUtxoId = (txIn: TxInParameter) =>
  `${txIn.txHash}${txIn.txIndex}`
