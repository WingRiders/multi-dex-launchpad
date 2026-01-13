import {initTRPC} from '@trpc/server'
import type {RouterRecord} from '@trpc/server/unstable-core-do-not-import'
import {z} from 'zod'
import {getAgentHealthcheck} from './agent/endpoints/healthcheck'
import {
  getAggregatorHealthcheck,
  getAllModesHealthcheck,
  getServerHealthcheck,
} from './aggregator/endpoints/healthcheck'
import {submitTx} from './aggregator/ogmios/tx-submission-client'

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

export const createAgentRouter = () =>
  t.router({
    healthcheck: publicProcedure.query(getAgentHealthcheck),
  })

const omitHealthcheck = <T extends RouterRecord>(
  procedures: T,
): Omit<T, 'healthcheck'> =>
  Object.fromEntries(
    Object.entries(procedures).filter(([key]) => key !== 'healthcheck'),
  ) as Omit<T, 'healthcheck'>

export const createAllModesRouter = () =>
  mergeRouters(
    t.router(omitHealthcheck(createAggregatorRouter()._def.procedures)),
    t.router(omitHealthcheck(createServerRouter()._def.procedures)),
    t.router(omitHealthcheck(createAgentRouter()._def.procedures)),
    t.router({
      healthcheck: publicProcedure.query(getAllModesHealthcheck),
    }),
  )

// export type definition of API
export type ServerAppRouter = ReturnType<typeof createServerRouter>
