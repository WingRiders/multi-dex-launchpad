import {initTRPC} from '@trpc/server'
import type {RouterRecord} from '@trpc/server/unstable-core-do-not-import'
import {launchTimeStatuses} from '@wingriders/multi-dex-launchpad-common'
import superjson from 'superjson'
import {z} from 'zod'
import {
  getAgentHealthcheck,
  getAllModesHealthcheck,
  getServerHealthcheck,
} from './agent/endpoints/healthcheck'
import {submitTx} from './agent/ogmios/tx-submission-client'
import {getTokenMetadata, getTokensMetadata} from './endpoints/token-metadata'
import {mockedLaunches} from './mocked-data'

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
    launches: publicProcedure
      .input(
        z
          .object({
            timeStatus: z.enum(launchTimeStatuses).optional(),
          })
          .optional(),
      )
      .query(async ({input: {timeStatus} = {}}) => {
        const now = Date.now()
        return mockedLaunches.filter((launch) => {
          switch (timeStatus) {
            case 'past':
              return launch.endTime.getTime() < now
            case 'active':
              return (
                launch.startTime.getTime() <= now &&
                launch.endTime.getTime() >= now
              )
            case 'upcoming':
              return launch.startTime.getTime() > now
            default:
              return true
          }
        })
      }),
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
