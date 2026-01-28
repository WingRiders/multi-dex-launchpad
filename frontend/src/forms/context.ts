import {createFormHook, createFormHookContexts} from '@tanstack/react-form'
import {SelectField} from './select-field'
import {SliderField} from './slider-field'
import {TextField} from './text-field'
import {UnitQuantityField} from './unit-quantity-field'

export const {fieldContext, formContext, useFieldContext, useFormContext} =
  createFormHookContexts()

export const {useAppForm} = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    SelectField,
    UnitQuantityField,
    SliderField,
  },
  formComponents: {},
})
