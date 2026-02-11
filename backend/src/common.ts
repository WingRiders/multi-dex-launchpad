import {SLOT_CONFIG_NETWORK, unixTimeToEnclosingSlot} from '@meshsdk/common'
import {config} from './config'

export const timeToSlot = (time: number | bigint) =>
  unixTimeToEnclosingSlot(Number(time), SLOT_CONFIG_NETWORK[config.NETWORK])
