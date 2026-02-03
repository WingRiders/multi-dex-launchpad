'use client'

import {useSuspenseQuery} from '@tanstack/react-query'
import type {LaunchTimeStatus} from '@wingriders/multi-dex-launchpad-common'
import {LaunchItem} from '@/components/launch-item'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
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
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error while loading {title}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : String(error)}
          </AlertDescription>
        </Alert>
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
