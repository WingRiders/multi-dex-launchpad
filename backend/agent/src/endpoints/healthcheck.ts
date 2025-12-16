import {TRPCError} from '@trpc/server'
import {prisma} from '../db/prisma-client'

const getHealthStatus = async () => {
  const lastBlockPromise = prisma.block.findFirst({orderBy: [{slot: 'desc'}]})
  const [lastBlockSlot, isDbConnected] = await Promise.all([
    lastBlockPromise.then((block) => (block ? block.slot : 0)).catch(() => 0),
    lastBlockPromise.then(() => true).catch(() => false),
  ])

  const healthy = isDbConnected

  return {
    healthy,
    lastBlockSlot,
    isDbConnected,
    uptime: process.uptime(),
  }
}

export const getHealthcheck = async () => {
  const healthStatus = await getHealthStatus()

  if (!healthStatus.healthy) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Healthcheck failed: ${JSON.stringify(healthStatus)}`,
    })
  }

  return healthStatus
}
