import type {LaunchTimeStatus} from '@wingriders/multi-dex-launchpad-common'
import {cva} from 'class-variance-authority'
import {Badge} from './ui/badge'

type LaunchTimeStatusBadgeProps = {
  status: LaunchTimeStatus
}

const statusVariants = cva('', {
  variants: {
    status: {
      upcoming:
        'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
      active:
        'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      past: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200',
    },
  },
})

export const LaunchTimeStatusBadge = ({status}: LaunchTimeStatusBadgeProps) => {
  return <Badge className={statusVariants({status})}>{status}</Badge>
}
