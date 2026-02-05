import {format} from 'date-fns'

export const formatDateTime = (
  value: Date | number,
  options: {showSeconds?: boolean} = {},
) => {
  return format(
    new Date(value),
    options.showSeconds ? 'MM/dd/yyyy HH:mm:ss' : 'MM/dd/yyyy HH:mm',
  )
}
