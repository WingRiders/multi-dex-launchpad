import {deserializeDatum} from '@meshsdk/core'
import {Result} from 'better-result'
import type z from 'zod'
import type {ZodType} from 'zod'

export const decodeDatum = <T extends ZodType>(
  cborSchema: T,
  datumCbor: string,
): z.core.output<T> | null =>
  Result.try(() => {
    // throws on invalid cbor
    const datum = deserializeDatum(datumCbor)
    // throws on failed parsing
    const parsed = cborSchema.parse(datum)
    return parsed
  }).unwrapOr(null)
