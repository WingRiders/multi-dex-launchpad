'use client'

import {ErrorBoundary} from 'react-error-boundary'
import {ErrorAlert} from '@/components/error-alert'
import {WithLaunchesSectionTitle} from './with-launches-section-title'

type LaunchesSectionErrorBoundaryProps = {
  title: string
  wrapWithTitle?: boolean
  children: React.ReactNode
}

export const LaunchesSectionErrorBoundary = ({
  title,
  wrapWithTitle,
  children,
}: LaunchesSectionErrorBoundaryProps) => {
  return (
    <ErrorBoundary
      fallbackRender={({error}) => (
        <WithLaunchesSectionTitle title={title} wrap={wrapWithTitle}>
          <ErrorAlert
            title={`Error while loading ${title}`}
            description={error instanceof Error ? error.message : String(error)}
            className="mt-4"
          />
        </WithLaunchesSectionTitle>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
