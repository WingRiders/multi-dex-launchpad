'use client'

import {useSuspenseQuery} from '@tanstack/react-query'
import type {LaunchTimeStatus} from '@wingriders/multi-dex-launchpad-common'
import {ErrorAlert} from '@/components/error-alert'
import {LaunchItem} from '@/components/launch-item'
import {useTRPC} from '@/trpc/client'
import {WithLaunchesSectionTitle} from './with-launches-section-title'

type LaunchesListProps = {
  timeStatus: LaunchTimeStatus
  title: string
  hideIfEmpty?: boolean
}

export const LaunchesList = ({
  timeStatus,
  title,
  hideIfEmpty,
}: LaunchesListProps) => {
  const trpc = useTRPC()
  const {data, error} = useSuspenseQuery(
    trpc.launches.queryOptions({timeStatus}),
  )

  if (hideIfEmpty && data && data.length === 0) return null

  if (data && data.length > 0)
    return (
      <WithLaunchesSectionTitle title={title} wrap={hideIfEmpty}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((launch) => (
            <LaunchItem key={launch.txHash} launch={launch} />
          ))}
        </div>
      </WithLaunchesSectionTitle>
    )

  if (error)
    return (
      <WithLaunchesSectionTitle title={title} wrap={hideIfEmpty}>
        <ErrorAlert
          title={`Error while loading ${title}`}
          description={error.message}
          className="mt-4"
        />
      </WithLaunchesSectionTitle>
    )

  return (
    <WithLaunchesSectionTitle title={title} wrap={hideIfEmpty}>
      <div className="flex h-40 items-center justify-center rounded-md bg-muted text-md">
        No launches found
      </div>
    </WithLaunchesSectionTitle>
  )
}
