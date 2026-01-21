'use client'

import {useQuery} from '@tanstack/react-query'
import type {LaunchTimeStatus} from '@wingriders/multi-dex-launchpad-common'
import {LaunchItem} from '@/components/launch-item'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Skeleton} from '@/components/ui/skeleton'
import {useTRPC} from '@/trpc/client'

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
  const {data, error, isLoading} = useQuery(
    trpc.launches.queryOptions({timeStatus}),
  )

  if (hideIfEmpty && data && data.length === 0) return null

  if (data && data.length > 0)
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((launch) => (
          <LaunchItem key={launch.id} launch={launch} />
        ))}
      </div>
    )

  if (error)
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTitle>Error while loading {title}</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : String(error)}
        </AlertDescription>
      </Alert>
    )

  if (isLoading) return <Skeleton className="h-60 w-full" />

  return (
    <div className="flex h-40 items-center justify-center rounded-md bg-muted text-md">
      No launches found
    </div>
  )
}
