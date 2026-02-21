import type {MeshTxBuilder} from '@meshsdk/core'

export const compareHexStrings = (a: string, b: string) =>
  Buffer.from(a, 'hex').compare(Buffer.from(b, 'hex'))

export const compareBigInts = (a: bigint, b: bigint) =>
  a > b ? 1 : a < b ? -1 : 0

export const getMeshBuilderBodyForLogging = (b: MeshTxBuilder) => {
  // extraInputs are too much noise in the error logs, which tend to repeat once hit. And it is also omitted in Mesh trace logs
  const {extraInputs, ...txBuilderBody} = b.meshTxBuilderBody
  return txBuilderBody
}
