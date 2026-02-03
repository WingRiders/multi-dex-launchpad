import {InfoIcon} from 'lucide-react'
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {Slider} from '@/components/ui/slider'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {useFieldContext} from './context'

type SliderFieldProps = {
  label: string
  tooltip?: string
  min?: number
  max?: number
  step?: number
}

export const SliderField = ({
  label,
  tooltip,
  min,
  max,
  step,
}: SliderFieldProps) => {
  const field = useFieldContext<number>()

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldContent className="flex-row items-center">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </FieldContent>
      <Slider
        id={field.name}
        name={field.name}
        value={[field.state.value]}
        onValueChange={([value]) => field.handleChange(value!)}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid}
        min={min}
        max={max}
        step={step}
      />

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
