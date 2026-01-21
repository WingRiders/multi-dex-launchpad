import {format} from 'date-fns'

export const formatDateTime = (value: Date | number) => {
  return format(new Date(value), 'PPp')
}
