import {deserializeDatum} from '@meshsdk/core'
import {Result} from 'better-result'
import type {ZodType} from 'zod'

export const decodeDatum = <T extends ZodType>(
  cborSchema: T,
  datumCbor: string,
) => Result.try(() => cborSchema.parse(deserializeDatum(datumCbor)))
