import {TRPCError} from '@trpc/server'
import {prisma} from '../db/prisma-client'

const getAggregatorHealthStatus = async () => {
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

export const getAggregatorHealthcheck = async () => {
  const healthStatus = await getAggregatorHealthStatus()

  if (!healthStatus.healthy) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Healthcheck failed: ${JSON.stringify(healthStatus)}`,
    })
  }

  return healthStatus
}

const getServerHealthStatus = async () => {
  const isDbConnected = await prisma.block
    .findFirst({
      orderBy: [{slot: 'desc'}],
    })
    .then(() => true)
    .catch(() => false)

  const healthy = isDbConnected

  return {
    healthy,
    isDbConnected,
    uptime: process.uptime(),
  }
}
export const getServerHealthcheck = async () => {
  const healthStatus = await getServerHealthStatus()

  if (!healthStatus.healthy) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Healthcheck failed: ${JSON.stringify(healthStatus)}`,
    })
  }

  return healthStatus
}

export const getBothModeHealthcheck = async () => {
  const [aggregatorHealthStatus, serverHealthStatus] = await Promise.all([
    getAggregatorHealthStatus(),
    getServerHealthStatus(),
  ])

  const healthStatus = {
    ...aggregatorHealthStatus,
    ...serverHealthStatus,
    healthy: aggregatorHealthStatus.healthy && serverHealthStatus.healthy,
  }

  if (!healthStatus.healthy) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Healthcheck failed: ${JSON.stringify(healthStatus)}`,
    })
  }

  return healthStatus
}
