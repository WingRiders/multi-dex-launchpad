import {format} from 'date-fns'

export const formatDateTime = (value: Date | number) => {
  return format(new Date(value), 'MM/dd/yyyy HH:mm')
}
