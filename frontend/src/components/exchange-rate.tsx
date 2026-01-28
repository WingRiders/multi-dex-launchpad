import type {Unit} from '@meshsdk/core'
import BigNumber from 'bignumber.js'
import {useState} from 'react'
import {formatBigNumber} from '@/helpers/format-number'
import {useTokenMetadata} from '@/metadata/queries'

type ExchangeRateProps = {
  quantityA: bigint
  quantityB: bigint
  unitA: Unit
  unitB: Unit
}

export const ExchangeRate = ({
  quantityA,
  quantityB,
  unitA,
  unitB,
}: ExchangeRateProps) => {
  const [isReversed, setIsReversed] = useState(false)

  const {metadata: unitAMetadata} = useTokenMetadata(unitA)
  const {metadata: unitBMetadata} = useTokenMetadata(unitB)

  const {quantityX, quantityY, unitXMetadata, unitYMetadata} = isReversed
    ? {
        quantityX: quantityB,
        quantityY: quantityA,
        unitXMetadata: unitBMetadata,
        unitYMetadata: unitAMetadata,
      }
    : {
        quantityX: quantityA,
        quantityY: quantityB,
        unitXMetadata: unitAMetadata,
        unitYMetadata: unitBMetadata,
      }

  const quantityXReal = BigNumber(quantityX).shiftedBy(
    -(unitXMetadata?.decimals ?? 0),
  )
  const quantityYReal = BigNumber(quantityY).shiftedBy(
    -(unitYMetadata?.decimals ?? 0),
  )

  const unitXTicker = unitXMetadata?.ticker ?? unitXMetadata?.name ?? 'unknown'
  const unitYTicker = unitYMetadata?.ticker ?? unitYMetadata?.name ?? 'unknown'

  const rate = quantityXReal
    .dividedBy(quantityYReal)
    .decimalPlaces(unitYMetadata?.decimals ?? 0)

  return (
    <button
      type="button"
      onClick={() => setIsReversed(!isReversed)}
      aria-label={`Exchange rate: 1 ${unitYTicker} equals approximately ${formatBigNumber(rate)} ${unitXTicker}. Click to reverse the exchange rate direction.`}
      className="cursor-pointer rounded border-none bg-transparent p-0 font-inherit text-inherit hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      1 {unitYTicker} ≈ {formatBigNumber(rate)} {unitXTicker}
    </button>
  )
}
