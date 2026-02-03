'use client'

import {ErrorBoundary} from 'react-error-boundary'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
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
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error while loading {title}</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : String(error)}
            </AlertDescription>
          </Alert>
        </WithLaunchesSectionTitle>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
