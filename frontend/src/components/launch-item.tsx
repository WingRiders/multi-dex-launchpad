'use client'

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
  CardAction,
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
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-2xl">{launch.title}</CardTitle>
          <LaunchTimeStatusBadge status={timeStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link
          href={`/launch/${launch.txHash}`}
          className="block overflow-hidden rounded-lg"
        >
          <Image
            src={ipfsToHttps(launch.logoIpfsUrl)}
            className="h-52 w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            alt={launch.title}
            loading="eager"
            width={500}
            height={500}
          />
        </Link>
        <CardDescription className="text-sm">
          {launch.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4">
        <div className="text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{timeLabel}</span>
          <span className="ml-2">
            <time dateTime={new Date(timeValue).toISOString()}>
              {formatDateTime(timeValue)}
            </time>
          </span>
        </div>
        <CardAction>
          <Button asChild>
            <Link href={`/launch/${launch.txHash}`}>View details</Link>
          </Button>
        </CardAction>
      </CardFooter>
    </Card>
  )
}
