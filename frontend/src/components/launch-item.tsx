'use client'

import {ArrowUpRightIcon} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {formatDateTime} from '@/helpers/format'
import {useLaunchTimeStatus} from '@/helpers/time'
import {ipfsToHttps} from '@/helpers/url'
import type {Launch} from '@/types'
import {LaunchTimeStatusBadge} from './launch-time-status-badge'
import {Button} from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'

type LaunchItemProps = {
  launch: Launch
}

export const LaunchItem = ({launch}: LaunchItemProps) => {
  const timeStatus = useLaunchTimeStatus(launch)

  const [timeLabel, timeValue] =
    timeStatus === 'upcoming'
      ? ['Starts', launch.startTime]
      : ['Ends', launch.endTime]

  return (
    <Card className="group overflow-hidden border-border/60 pt-0 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/launch/${launch.txHash}`}>
        <div className="relative aspect-video w-full overflow-hidden bg-muted/50">
          <Image
            src={ipfsToHttps(launch.logoIpfsUrl)}
            className="object-cover transition-all duration-500 group-hover:scale-105"
            alt={launch.title}
            loading="eager"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div
            className="absolute inset-0 bg-linear-to-t from-0% from-card via-25% via-card/40 to-40% to-transparent"
            aria-hidden
          />
          <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between">
            <LaunchTimeStatusBadge
              startTime={launch.startTime.getTime()}
              defaultStartTime={launch.defaultStartTime.getTime()}
              endTime={launch.endTime.getTime()}
            />
          </div>
        </div>
      </Link>

      <CardHeader>
        <CardTitle className="line-clamp-2 font-semibold text-xl tracking-tight">
          {launch.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        <CardDescription className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {launch.description}
        </CardDescription>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-border/60 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{timeLabel}</span>
          <span className="text-muted-foreground">·</span>
          <time
            dateTime={new Date(timeValue).toISOString()}
            className="text-muted-foreground"
          >
            {formatDateTime(timeValue)}
          </time>
        </div>

        <Button asChild variant="ghost">
          <Link href={`/launch/${launch.txHash}`}>
            View details
            <ArrowUpRightIcon className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
