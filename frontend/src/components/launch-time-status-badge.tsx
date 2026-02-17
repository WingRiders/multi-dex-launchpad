import {cva, type VariantProps} from 'class-variance-authority'
import {useMemo} from 'react'
import {useUpdatedTime} from '@/helpers/time'
import {Badge} from './ui/badge'

const statusVariants = cva('text-sm', {
  variants: {
    status: {
      upcoming:
        'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
      'presale-active':
        'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      'public-active':
        'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      past: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200',
    },
  },
})

type LaunchTimeStatus = NonNullable<
  VariantProps<typeof statusVariants>['status']
>

type LaunchTimeStatusBadgeProps = {
  startTime: number
  defaultStartTime: number
  endTime: number
}

export const LaunchTimeStatusBadge = ({
  startTime,
  defaultStartTime,
  endTime,
}: LaunchTimeStatusBadgeProps) => {
  const time = useUpdatedTime(
    useMemo(
      () => [startTime, defaultStartTime, endTime],
      [startTime, defaultStartTime, endTime],
    ),
  )

  const status = useMemo<LaunchTimeStatus>(() => {
    if (time > endTime) return 'past'
    if (time < startTime) return 'upcoming'
    return time > defaultStartTime ? 'public-active' : 'presale-active'
  }, [time, startTime, defaultStartTime, endTime])

  const label = {
    upcoming: 'Upcoming',
    'presale-active': 'Presale active',
    'public-active': 'Public sale active',
    past: 'Past',
  }[status]

  return <Badge className={statusVariants({status})}>{label}</Badge>
}
