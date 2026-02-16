export const compareHexStrings = (a: string, b: string) =>
  Buffer.from(a, 'hex').compare(Buffer.from(b, 'hex'))

export const compareBigInts = (a: bigint, b: bigint) =>
  a > b ? 1 : a < b ? -1 : 0
