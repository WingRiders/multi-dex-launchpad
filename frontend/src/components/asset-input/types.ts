import type {Unit} from '@meshsdk/core'

export type AssetInputItem = {
  unit: Unit
  balance: bigint
}

export type AssetInputValue = {
  unit: Unit | null
  quantity: bigint | null
}
