import {cva, type VariantProps} from 'class-variance-authority'
import type {ReactNode} from 'react'
import {cn} from '@/lib/utils'
import {InfoTooltip} from './info-tooltip'
import {Skeleton} from './ui/skeleton'

const gridItemVariants = cva('', {
  variants: {
    direction: {
      horizontal: 'flex flex-row items-center gap-2',
      vertical: 'flex flex-col gap-1',
    },
  },
})

type GridItemProps = {
  label: string
  value: ReactNode
  isLoading?: boolean
  tooltip?: string
  className?: string
  direction?: VariantProps<typeof gridItemVariants>['direction']
}

export const GridItem = ({
  label,
  value,
  isLoading,
  tooltip,
  className,
  direction = 'vertical',
}: GridItemProps) => {
  return (
    <div className={cn(gridItemVariants({direction}), className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <p className="text-sm">{label}</p>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      {isLoading ? <Skeleton className="h-4 w-[50%]" /> : value}
    </div>
  )
}
