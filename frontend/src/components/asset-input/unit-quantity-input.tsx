import type {Unit} from '@meshsdk/core'
import {BigNumber} from 'bignumber.js'
import {NumericFormat} from 'react-number-format'
import {DECIMAL_SEPARATOR, THOUSAND_SEPARATOR} from '../../constants'
import {useTokenMetadata} from '../../metadata/queries'
import {Input} from '../ui/input'

const MAX_VALUE = 1000000000000000000000n

type UnitQuantityInputProps = {
  value: bigint | null
  onChange: (value: bigint | null) => void
  unit: Unit | null
} & Omit<
  React.ComponentProps<typeof NumericFormat>,
  'customInput' | 'onValueChange' | 'value' | 'onChange'
>

export const UnitQuantityInput = ({
  value,
  onChange,
  unit,
  ...props
}: UnitQuantityInputProps) => {
  const {metadata} = useTokenMetadata(unit)
  const decimalScale = metadata?.decimals ?? 0
  const stringValue =
    value != null
      ? BigNumber(value).shiftedBy(-decimalScale).toString()
      : undefined

  return (
    <NumericFormat
      customInput={Input}
      thousandSeparator={THOUSAND_SEPARATOR}
      decimalSeparator={DECIMAL_SEPARATOR}
      allowedDecimalSeparators={['.', ',']}
      decimalScale={decimalScale}
      allowNegative={false}
      isAllowed={({value}) => !value || BigInt(value) <= MAX_VALUE}
      type="text"
      placeholder={Number(0).toFixed(decimalScale)}
      onValueChange={({value: newValue}, {source}) => {
        if (source === 'prop') return
        const parsedValue = BigNumber(newValue)

        onChange(
          parsedValue.isNaN()
            ? null
            : BigInt(
                parsedValue.shiftedBy(decimalScale).integerValue().toString(),
              ),
        )
      }}
      value={stringValue}
      valueIsNumericString
      autoComplete="off"
      {...props}
    />
  )
}
