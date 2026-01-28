import {Field, FieldError, FieldLabel} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {useFieldContext} from './context'

type TextFieldProps = {
  label: string
  placeholder?: string
  isOptional?: boolean
  showCharactersCountForMax?: number
  charactersCountAlign?: React.ComponentProps<typeof InputGroupAddon>['align']
  useTextArea?: boolean
}

export const TextField = ({
  label,
  placeholder,
  isOptional,
  showCharactersCountForMax,
  charactersCountAlign = 'block-end',
  useTextArea,
}: TextFieldProps) => {
  const field = useFieldContext<string>()

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const InputComponent = useTextArea ? InputGroupTextarea : InputGroupInput

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
      <InputGroup>
        <InputComponent
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          placeholder={placeholder}
        />
        {showCharactersCountForMax != null && (
          <InputGroupAddon align={charactersCountAlign}>
            <InputGroupText className="tabular-nums">
              {field.state.value.length}/{showCharactersCountForMax} characters
            </InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
