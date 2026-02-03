'use client'

import {ErrorBoundary} from 'react-error-boundary'
import {ErrorAlert} from '@/components/error-alert'

type LaunchDetailsErrorBoundaryProps = {
  children: React.ReactNode
}

export const LaunchDetailsErrorBoundary = ({
  children,
}: LaunchDetailsErrorBoundaryProps) => {
  return (
    <ErrorBoundary
      fallbackRender={({error}) => (
        <ErrorAlert
          title="Error while loading launch"
          description={error instanceof Error ? error.message : String(error)}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
