import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {useFieldContext} from './context'

type SelectFieldProps = {
  label: string
  items: {label: React.ReactNode; value: string}[]
  placeholder?: string
  onChangeListener?: (prevValue: string, newValue: string) => void
}

export const SelectField = ({
  label,
  items,
  placeholder,
  onChangeListener,
}: SelectFieldProps) => {
  const field = useFieldContext<string>()

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </FieldContent>
      <Select
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => {
          onChangeListener?.(field.state.value, value)
          field.handleChange(value)
        }}
        aria-invalid={isInvalid}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={isInvalid}
          className="min-w-[120px]"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
