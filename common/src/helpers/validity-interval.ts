import {
  SLOT_CONFIG_NETWORK,
  slotToBeginUnixTime,
  unixTimeToEnclosingSlot,
} from '@meshsdk/common'
import {
  DEFAULT_TX_TTL,
  DEFAULT_TX_VALIDITY_START_BACKDATE_MS,
} from '../constants'
import type {Network} from './network'

export const calculateTxValidityInterval = (
  network: Network,
  now = Date.now(),
) => {
  const slotConfig = SLOT_CONFIG_NETWORK[network]

  const validityStartTime = now - DEFAULT_TX_VALIDITY_START_BACKDATE_MS
  const validityStartSlot = unixTimeToEnclosingSlot(
    validityStartTime,
    slotConfig,
  )

  const validityEndTime = validityStartTime + DEFAULT_TX_TTL
  const validityEndSlot = unixTimeToEnclosingSlot(validityEndTime, slotConfig)

  return {
    validityStartSlot,
    validityEndSlot,
  }
}

// can be used for all actions that need to happen before the launch starts: init launch, cancel launch, insert separators
export const calculateTxValidityIntervalBeforeLaunchStart = (
  network: Network,
  launchStartTime: number,
  now = Date.now(),
) => {
  if (now >= launchStartTime) {
    throw new Error(
      'Cannot calculate validity interval, launch has already started',
    )
  }

  const slotConfig = SLOT_CONFIG_NETWORK[network]
  const validityInterval = calculateTxValidityInterval(network, now)

  const validityEndTime = slotToBeginUnixTime(
    validityInterval.validityEndSlot,
    slotConfig,
  )
  const adjustedValidityEndTime = Math.min(
    validityEndTime,
    launchStartTime - 1000,
  )
  validityInterval.validityEndSlot = unixTimeToEnclosingSlot(
    adjustedValidityEndTime,
    slotConfig,
  )

  return validityInterval
}

export const calculateTxValidityIntervalForInsertNode = (
  network: Network,
  tierStartTime: number,
  launchEndTime: number,
  now = Date.now(),
) => {
  if (now >= launchEndTime) {
    throw new Error('Cannot calculate validity interval, launch has ended.')
  }

  // if user is trying to build the tx before tierStartTime, we act as if it was built 1 second after tierStartTime,
  // which is the soonest possible time for building the tx (we are allowing users to build the tx but it will be rejected by node)
  if (now <= tierStartTime) {
    now = tierStartTime + 1000
  }

  const slotConfig = SLOT_CONFIG_NETWORK[network]
  const validityInterval = calculateTxValidityInterval(network, now)

  // Validity start must be after tierStartTime: clamp to tierStartTime + 1ms (dates in ms)
  const validityStartTime = slotToBeginUnixTime(
    validityInterval.validityStartSlot,
    slotConfig,
  )
  const adjustedValidityStartTime = Math.max(
    validityStartTime,
    tierStartTime + 1000,
  )
  validityInterval.validityStartSlot = unixTimeToEnclosingSlot(
    adjustedValidityStartTime,
    slotConfig,
  )

  // Validity end must be before launchEndTime: clamp to launchEndTime
  const validityEndTime = slotToBeginUnixTime(
    validityInterval.validityEndSlot,
    slotConfig,
  )
  const adjustedValidityEndTime = Math.min(
    validityEndTime,
    launchEndTime - 1000,
  )
  validityInterval.validityEndSlot = unixTimeToEnclosingSlot(
    adjustedValidityEndTime,
    slotConfig,
  )

  if (validityInterval.validityStartSlot > validityInterval.validityEndSlot) {
    throw new Error(
      'Cannot calculate validity interval: tier window is too narrow (validity start would be after validity end).',
    )
  }

  return validityInterval
}

// can be used for all actions that need to happen before the launch ends: remove node
export const calculateTxValidityIntervalBeforeLaunchEnd = (
  network: Network,
  launchEndTime: number,
  now = Date.now(),
) => {
  if (now >= launchEndTime) {
    throw new Error(
      'Cannot calculate validity interval, launch has already ended',
    )
  }

  const slotConfig = SLOT_CONFIG_NETWORK[network]
  const validityInterval = calculateTxValidityInterval(network, now)

  const validityEndTime = slotToBeginUnixTime(
    validityInterval.validityEndSlot,
    slotConfig,
  )
  const adjustedValidityEndTime = Math.min(
    validityEndTime,
    launchEndTime - 1000,
  )
  validityInterval.validityEndSlot = unixTimeToEnclosingSlot(
    adjustedValidityEndTime,
    slotConfig,
  )

  return validityInterval
}
