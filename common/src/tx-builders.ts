import {
  type IEvaluator,
  type ISubmitter,
  MeshTxBuilder,
  type MeshTxBuilderBody,
} from '@meshsdk/core'
import {Result} from 'better-result'
import {
  type RefScriptCarrierDatum,
  refScriptCarrierDatumToMeshData,
} from './datums'
import type {Network} from './helpers/network'
import {getRefScriptCarrierValidatorAddress} from './on-chain/addresses'
import type {Contract} from './on-chain/types'

export const makeBuilder = (
  changeAddress: string,
  network: Network,
  submitter: ISubmitter,
  evaluator: IEvaluator,
): MeshTxBuilder =>
  new MeshTxBuilder({
    submitter,
    evaluator,
  })
    .setNetwork(network)
    .changeAddress(changeAddress)

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

export const buildTx = (b: MeshTxBuilder) =>
  Result.tryPromise(() => b.complete())

export const getLogContextFromTxBuilderBody = (
  txBuilderBody: MeshTxBuilderBody,
) => ({
  inputs: txBuilderBody.inputs,
  outputs: txBuilderBody.outputs.map(({address, amount}) => ({
    address,
    amount,
  })),
  extraInputs: txBuilderBody.extraInputs.map(({input, output}) => ({
    input,
    output: {
      address: output.address,
      amount: output.amount,
    },
  })),
})
