import {deserializeAddress} from '@meshsdk/core'

export const tryDeserializeAddress = (address: string) => {
  try {
    return deserializeAddress(address)
  } catch (_e) {
    return null
  }
}
