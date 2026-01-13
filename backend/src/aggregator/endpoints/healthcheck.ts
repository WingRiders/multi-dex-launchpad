import {TRPCError} from '@trpc/server'
import {getAgentHealthStatus} from '../../agent/endpoints/healthcheck'
import {prisma} from '../../db/prisma-client'
import {tipToSlot} from '../../helpers'
import {getLedgerTip, getNetworkTip} from '../ogmios/ledger-state-query'
import {isTxSubmissionClientInitialized as isTxSubmissionClientInitializedFn} from '../ogmios/tx-submission-client'

const IS_DB_SYNCED_THRESHOLD_SLOTS = 300 // 5 minutes

const getAggregatorHealthStatus = async () => {
  const lastBlockPromise = prisma.block.findFirst({orderBy: [{slot: 'desc'}]})
  const networkTipPromise = getNetworkTip()
  const [
    networkSlot,
    ledgerSlot,
    lastBlockSlot,
    isDbConnected,
    isOgmiosConnected,
  ] = await Promise.all([
    networkTipPromise.then(tipToSlot).catch(() => 0),
    getLedgerTip()
      .then(tipToSlot)
      .catch(() => 0),
    lastBlockPromise.then((block) => (block ? block.slot : 0)).catch(() => 0),
    lastBlockPromise.then(() => true).catch(() => false),
    networkTipPromise.then(() => true).catch(() => false),
  ])

  const isDbSynced =
    networkSlot - ledgerSlot < IS_DB_SYNCED_THRESHOLD_SLOTS &&
    ledgerSlot - lastBlockSlot < IS_DB_SYNCED_THRESHOLD_SLOTS

  const healthy = isDbConnected && isDbSynced && isOgmiosConnected

  return {
    healthy,
    networkSlot,
    ledgerSlot,
    lastBlockSlot,
    isDbConnected,
    isDbSynced,
    isOgmiosConnected,
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
  const isTxSubmissionClientInitialized = isTxSubmissionClientInitializedFn()

  const healthy = isDbConnected && isTxSubmissionClientInitialized

  return {
    healthy,
    isDbConnected,
    isTxSubmissionClientInitialized,
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

export const getAllModesHealthcheck = async () => {
  const [aggregatorHealthStatus, serverHealthStatus, agentHealthStatus] =
    await Promise.all([
      getAggregatorHealthStatus(),
      getServerHealthStatus(),
      getAgentHealthStatus(),
    ])

  const healthStatus = {
    ...aggregatorHealthStatus,
    ...serverHealthStatus,
    ...agentHealthStatus,
    healthy:
      aggregatorHealthStatus.healthy &&
      serverHealthStatus.healthy &&
      agentHealthStatus.healthy,
  }

  if (!healthStatus.healthy) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Healthcheck failed: ${JSON.stringify(healthStatus)}`,
    })
  }

  return healthStatus
}
