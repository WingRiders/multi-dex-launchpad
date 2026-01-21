import type {ReactNode} from 'react'
import {cn} from '@/lib/utils'

type PageContainerProps = {
  children?: ReactNode
  className?: string
}

export const PageContainer = ({children, className}: PageContainerProps) => {
  return (
    <div className={cn('mx-auto my-4 max-w-7xl px-4', className)}>
      {children}
    </div>
  )
}
