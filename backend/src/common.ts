import {SLOT_CONFIG_NETWORK, unixTimeToEnclosingSlot} from '@meshsdk/common'
import {slotToBeginUnixTime} from '@meshsdk/core'
import {config} from './config'

export const timeToSlot = (time: number | bigint) =>
  unixTimeToEnclosingSlot(Number(time), SLOT_CONFIG_NETWORK[config.NETWORK])

export const slotToTime = (slot: number | bigint) =>
  slotToBeginUnixTime(Number(slot), SLOT_CONFIG_NETWORK[config.NETWORK])
