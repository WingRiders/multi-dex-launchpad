import {dehydrate, HydrationBoundary} from '@tanstack/react-query'
import type {LaunchTimeStatus} from '@wingriders/multi-dex-launchpad-common'
import {Suspense} from 'react'
import {Skeleton} from '@/components/ui/skeleton'
import {makeQueryClient} from '@/trpc/query-client'
import {getServerTrpc} from '@/trpc/server'
import {LaunchesList} from './launches-list'
import {LaunchesSectionErrorBoundary} from './launches-section-error-boundary'
import {WithLaunchesSectionTitle} from './with-launches-section-title'

type LaunchesSectionProps = {
  title: string
  timeStatus: LaunchTimeStatus
  displayType: 'hide-if-empty' | 'show-loading'
}

export const LaunchesSection = async ({
  title,
  timeStatus,
  displayType,
}: LaunchesSectionProps) => {
  switch (displayType) {
    case 'show-loading':
      return (
        <WithLaunchesSectionTitle title={title} wrap>
          <LaunchesSectionErrorBoundary title={title}>
            <Suspense fallback={<Skeleton className="h-60 w-full" />}>
              <FetchedLaunchesList title={title} timeStatus={timeStatus} />
            </Suspense>
          </LaunchesSectionErrorBoundary>
        </WithLaunchesSectionTitle>
      )
    case 'hide-if-empty':
      return (
        <LaunchesSectionErrorBoundary title={title} wrapWithTitle>
          <FetchedLaunchesSection title={title} timeStatus={timeStatus} />
        </LaunchesSectionErrorBoundary>
      )
  }
}

type FetchedLaunchesListProps = {
  title: string
  timeStatus: LaunchTimeStatus
}

const FetchedLaunchesList = async ({
  title,
  timeStatus,
}: FetchedLaunchesListProps) => {
  const trpc = getServerTrpc()
  const queryClient = makeQueryClient()

  queryClient.prefetchQuery(trpc.launches.queryOptions({timeStatus}))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LaunchesList title={title} timeStatus={timeStatus} />
    </HydrationBoundary>
  )
}

type FetchedLaunchesSectionProps = {
  title: string
  timeStatus: LaunchTimeStatus
}

const FetchedLaunchesSection = async ({
  title,
  timeStatus,
}: FetchedLaunchesSectionProps) => {
  const trpc = getServerTrpc()
  const queryClient = makeQueryClient()

  queryClient.prefetchQuery(trpc.launches.queryOptions({timeStatus}))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LaunchesList title={title} timeStatus={timeStatus} hideIfEmpty />
    </HydrationBoundary>
  )
}
