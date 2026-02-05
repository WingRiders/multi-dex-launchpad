export * from './create-commitment'
export * from './init-launchpad'
export * from './ref-script-carriers'
export * from './remove-commitment'

import type {IEvaluator, ISubmitter, MeshTxBuilderBody} from '@meshsdk/common'
import {MeshTxBuilder} from '@meshsdk/core'
import {Result} from 'better-result'
import type {Network} from '..'

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
