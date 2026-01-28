import type {Unit} from '@meshsdk/core'
import type {QueryClient} from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import type {TRPC} from '@/trpc/client'
import {getTokenMetadataFromQueryCache} from './queries'

/**
 * Transforms a quantity from one unit to another, taking into account the decimals of the units.
 */
export const transformQuantityToNewUnitDecimals = (
  quantity: bigint,
  oldUnit: Unit | null,
  newUnit: Unit | null,
  trpc: TRPC,
  queryClient: QueryClient,
): bigint => {
  const getUnitDecimals = (unit: Unit | null) => {
    return unit
      ? (getTokenMetadataFromQueryCache(unit, queryClient, trpc).decimals ?? 0)
      : 0
  }
  const oldUnitDecimals = getUnitDecimals(oldUnit)
  const newUnitDecimals = getUnitDecimals(newUnit)

  const realQuantity = BigNumber(quantity).shiftedBy(-oldUnitDecimals)
  return BigInt(
    realQuantity.shiftedBy(newUnitDecimals).integerValue().toString(),
  )
}
