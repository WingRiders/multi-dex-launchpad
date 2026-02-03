import type {ReactNode} from 'react'
import {cn} from '@/lib/utils'
import {InfoTooltip} from './info-tooltip'
import {Skeleton} from './ui/skeleton'

type GridItemProps = {
  label: string
  value: ReactNode
  isLoading?: boolean
  tooltip?: string
  className?: string
}

export const GridItem = ({
  label,
  value,
  isLoading,
  tooltip,
  className,
}: GridItemProps) => {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <p className="text-sm">{label}</p>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      {isLoading ? <Skeleton className="h-4 w-[50%]" /> : value}
    </div>
  )
}
