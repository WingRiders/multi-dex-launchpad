import {initTRPC} from '@trpc/server'
import type {RouterRecord} from '@trpc/server/unstable-core-do-not-import'
import {z} from 'zod'
import {
  getAggregatorHealthcheck,
  getBothModeHealthcheck,
  getServerHealthcheck,
} from './endpoints/healthcheck'
import {submitTx} from './ogmios/tx-submission-client'

export const t = initTRPC.create()
export const publicProcedure = t.procedure
export const mergeRouters = t.mergeRouters

export const createAggregatorRouter = () =>
  t.router({
    healthcheck: publicProcedure.query(getAggregatorHealthcheck),
  })

export const createServerRouter = () =>
  t.router({
    submitTx: publicProcedure
      .input(z.string())
      .mutation(({input}) => submitTx(input)),
    healthcheck: publicProcedure.query(getServerHealthcheck),
  })

const omitHealthcheck = <T extends RouterRecord>(
  procedures: T,
): Omit<T, 'healthcheck'> =>
  Object.fromEntries(
    Object.entries(procedures).filter(([key]) => key !== 'healthcheck'),
  ) as Omit<T, 'healthcheck'>

export const createBothModeRouter = () =>
  mergeRouters(
    t.router(omitHealthcheck(createAggregatorRouter()._def.procedures)),
    t.router(omitHealthcheck(createServerRouter()._def.procedures)),
    t.router({
      healthcheck: publicProcedure.query(getBothModeHealthcheck),
    }),
  )

// export type definition of API
export type ServerAppRouter = ReturnType<typeof createServerRouter>
