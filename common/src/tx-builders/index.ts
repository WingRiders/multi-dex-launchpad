export * from './cancel-launch'
export * from './claim-rewards'
export * from './create-commitment'
export * from './init-launch'
export * from './reclaim-commitments'
export * from './ref-script-carriers'
export * from './remove-commitment'

import type {IEvaluator, ISubmitter} from '@meshsdk/common'
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

// Use this only if you can't use the normal buildTx() for some reason.
// This will not verify the fee, you need to calculate it yourself.
// This will not balance the transaction either, pass in a balanced builder.
export const buildTxNeverUseUnlessManuallyBalancing = async (
  b: MeshTxBuilder,
  fee: bigint,
) =>
  // we need (b as any) to access protected fields
  await Result.tryPromise(async () => {
    ;(b as any).queueAllLastItem()
    b.removeDuplicateInputs()
    b.removeDuplicateRefInputs()
    for (const collateral of b.meshTxBuilderBody.collaterals)
      collateral.txIn.scriptSize = 0
    await (b as any).completeTxParts()
    await (b as any).sanitizeOutputs()
    b.sortTxParts()
    b.setFee(fee.toString())
    return await (b as any).completeSerialization()
  })
