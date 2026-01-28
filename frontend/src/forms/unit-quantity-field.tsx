import type {Unit} from '@meshsdk/core'
import {UnitQuantityInput} from '@/components/asset-input/unit-quantity-input'
import {Field, FieldError, FieldLabel} from '@/components/ui/field'
import {useFieldContext} from './context'

type UnitQuantityFieldProps = {
  label: string
  unit: Unit | null
  isOptional?: boolean
}

export const UnitQuantityField = ({
  label,
  unit,
  isOptional,
}: UnitQuantityFieldProps) => {
  const field = useFieldContext<bigint | null>()

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>
        {label}
        {isOptional && (
          <span className="font-normal text-muted-foreground text-sm">
            (optional)
          </span>
        )}
      </FieldLabel>

      <UnitQuantityInput
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e)}
        aria-invalid={isInvalid}
        unit={unit}
      />

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
