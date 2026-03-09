import type {MeshTxBuilder} from '@meshsdk/core'
import {ensure} from '@wingriders/multi-dex-launchpad-common'

export const compareHexStrings = (a: string, b: string) =>
  Buffer.from(a, 'hex').compare(Buffer.from(b, 'hex'))

export const compareBigInts = (a: bigint, b: bigint) =>
  a > b ? 1 : a < b ? -1 : 0

export const sumBigInts = (bigints: bigint[]) =>
  bigints.reduce((acc, cur) => acc + cur, 0n)

export const sqrtBigInt = (value: bigint): bigint => {
  ensure(
    value >= 0n,
    {value},
    'square root of negative numbers is not supported',
  )

  if (value < 2n) return value

  let x0 = value
  let x1 = (x0 + 1n) >> 1n

  while (x1 < x0) {
    x0 = x1
    x1 = (x1 + value / x1) >> 1n
  }

  return x0
}

export const getMeshBuilderBodyForLogging = (b: MeshTxBuilder) => {
  // extraInputs are too much noise in the error logs, which tend to repeat once hit. And it is also omitted in Mesh trace logs
  const {extraInputs, ...txBuilderBody} = b.meshTxBuilderBody
  return txBuilderBody
}
