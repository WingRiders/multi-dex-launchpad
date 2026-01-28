import type {Asset} from '@meshsdk/core'
import type {SetNonNullable} from 'type-fest'
import type {AssetInputValue} from './types'

export const isAssetInputValueNonEmpty = (
  value: AssetInputValue,
): value is SetNonNullable<AssetInputValue> =>
  value.unit != null && value.quantity != null

export const assetInputValueToAsset = (value: AssetInputValue): Asset => {
  if (!value.unit || !value.quantity) {
    throw new Error('Asset input value is not non-empty')
  }
  return {
    unit: value.unit,
    quantity: value.quantity.toString(),
  }
}
