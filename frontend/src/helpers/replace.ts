export const replaceBigIntsWithStrings = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (Array.isArray(value)) {
    return value.map(replaceBigIntsWithStrings)
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [
        key,
        replaceBigIntsWithStrings(value),
      ]),
    )
  }
  return value
}
