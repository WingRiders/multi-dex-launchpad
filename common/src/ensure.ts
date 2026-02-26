export class EnsureError extends Error {
  readonly details?: object

  constructor(message: string, details?: object) {
    if (details) {
      const serialized = JSON.stringify(
        details,
        (_, value) =>
          typeof value === 'bigint'
            ? {__type: 'bigint', value: value.toString()}
            : value,
        2,
      )

      message = `${message}\nDetails: ${serialized}`
    }

    super(message)
    this.details = details
  }
}

export function ensure(
  check: boolean,
  msgObj: string | object,
  msg?: string,
): asserts check {
  if (check) return
  if (typeof msgObj === 'string') {
    const err = new EnsureError(msgObj)
    Error.captureStackTrace(err, ensure) // Omits `ensure` from the stack
    throw err
  }
  const err = new EnsureError(msg ?? 'Error', msgObj)
  Error.captureStackTrace(err, ensure) // Omits `ensure` from the stack
  throw err
}
