import {createFormHook, createFormHookContexts} from '@tanstack/react-form'
import {DateTimeField} from './date-time-field'
import {SelectField} from './select-field'
import {SliderField} from './slider-field'
import {TextField} from './text-field'
import {UnitQuantityField} from './unit-quantity-field'

export const {fieldContext, formContext, useFieldContext, useFormContext} =
  createFormHookContexts()

export const {useAppForm, withFieldGroup} = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    SelectField,
    UnitQuantityField,
    SliderField,
    DateTimeField,
  },
  formComponents: {},
})
