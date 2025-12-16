import {initTRPC} from '@trpc/server'
import {getHealthcheck} from './endpoints/healthcheck'

export const t = initTRPC.create()
export const publicProcedure = t.procedure

export const createRouter = () =>
  t.router({
    healthcheck: publicProcedure.query(getHealthcheck),
  })

// export type definition of API
export type AppRouter = ReturnType<typeof createRouter>
