import {initTRPC} from '@trpc/server'
import type {RouterRecord} from '@trpc/server/unstable-core-do-not-import'
import superjson from 'superjson'
import {z} from 'zod'
import {
  getAgentHealthcheck,
  getAllModesHealthcheck,
  getServerHealthcheck,
} from './agent/endpoints/healthcheck'
import {submitTx} from './agent/ogmios/tx-submission-client'
import {getTokenMetadata, getTokensMetadata} from './endpoints/token-metadata'

export const t = initTRPC.create({
  transformer: superjson,
})
export const publicProcedure = t.procedure
export const mergeRouters = t.mergeRouters

export const createServerRouter = () =>
  t.router({
    submitTx: publicProcedure
      .input(z.string())
      .mutation(({input}) => submitTx(input)),
    healthcheck: publicProcedure.query(getServerHealthcheck),
    // using mutation instead of query because the input can be too large for a GET request
    tokensMetadata: publicProcedure
      .input(z.array(z.string()))
      .mutation(({input}) => getTokensMetadata(input)),
    tokenMetadata: publicProcedure
      .input(z.string())
      .query(({input}) => getTokenMetadata(input)),
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
    t.router(omitHealthcheck(createServerRouter()._def.procedures)),
    t.router(omitHealthcheck(createAgentRouter()._def.procedures)),
    t.router({
      healthcheck: publicProcedure.query(getAllModesHealthcheck),
    }),
  )

// export type definition of API
export type ServerAppRouter = ReturnType<typeof createServerRouter>
