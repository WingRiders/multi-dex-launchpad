import type {Unit} from '@meshsdk/core'
import type {LaunchConfig} from '@wingriders/multi-dex-launchpad-common'
import {cva} from 'class-variance-authority'
import {formatDistanceStrict} from 'date-fns'
import {round} from 'es-toolkit'
import {ActivityIcon, CheckIcon, CircleIcon, LockIcon} from 'lucide-react'
import {Fragment, useMemo} from 'react'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {formatDateTime} from '@/helpers/format'
import {useUpdatedTime} from '@/helpers/time'

type LaunchTimelineProps = {
  config: Pick<
    LaunchConfig,
    'presaleTierStartTime' | 'defaultStartTime' | 'endTime' | 'presaleTierCs'
  >
  isCancelled: boolean
}

type TimelineItemData = {
  label: string
  time: number
  additionalLabel?: string
  requiredUnit?: Unit
} & (
  | {
      status: 'completed' | 'upcoming'
    }
  | {
      status: 'active'
      progress: number // 0 - 1
    }
)

export const LaunchTimeline = ({
  config: {presaleTierStartTime, defaultStartTime, endTime, presaleTierCs},
  isCancelled,
}: LaunchTimelineProps) => {
  const time = useUpdatedTime(
    useMemo(
      () => [presaleTierStartTime, defaultStartTime, endTime],
      [presaleTierStartTime, defaultStartTime, endTime],
    ),
  )

  const itemsData = useMemo(() => {
    const dataItems: Omit<TimelineItemData, 'status'>[] = [
      {
        label: 'End',
        time: endTime,
      },
    ]

    if (presaleTierStartTime < endTime)
      dataItems.push({
        label: 'Presale',
        time: presaleTierStartTime,
        requiredUnit: presaleTierCs,
      })

    if (defaultStartTime < endTime)
      dataItems.push({
        label: 'Public sale',
        time: defaultStartTime,
      })

    return dataItems
      .sort((a, b) => a.time - b.time)
      .map<TimelineItemData>((data, index) => {
        const nextTime = dataItems[index + 1]?.time

        const status =
          time < data.time
            ? 'upcoming'
            : index === dataItems.length - 1 || time > (nextTime ?? Infinity)
              ? 'completed'
              : 'active'

        return {
          ...data,
          ...(status === 'active'
            ? {
                status,
                progress:
                  (time - data.time) / ((nextTime ?? Infinity) - data.time),
                additionalLabel:
                  nextTime != null && !isCancelled
                    ? `Ends ${formatDistanceStrict(nextTime, time, {addSuffix: true})}`
                    : undefined,
              }
            : {
                status,
                additionalLabel:
                  status === 'upcoming' &&
                  index !== dataItems.length - 1 &&
                  !isCancelled
                    ? `Starts ${formatDistanceStrict(data.time, time, {addSuffix: true})}`
                    : undefined,
              }),
        }
      })
  }, [
    time,
    endTime,
    presaleTierStartTime,
    defaultStartTime,
    presaleTierCs,
    isCancelled,
  ])

  return (
    <div className="flex w-full flex-row justify-between">
      {itemsData.map((data, index) => {
        const iconAnchorName = getIconAnchorName(index)
        const nextIconAnchorName = getIconAnchorName(index + 1)

        return (
          <Fragment key={index}>
            <TimelineItem data={data} iconAnchorName={iconAnchorName} />
            {index < itemsData.length - 1 && (
              <div
                className="relative"
                style={{
                  position: 'absolute',
                  positionAnchor: iconAnchorName,
                  left: 'anchor(right)',
                  right: `anchor(${nextIconAnchorName} left)`,
                  top: 'anchor(center)',
                  transform: 'translateY(-50%)',
                  height: 3,
                }}
              >
                <div className="absolute inset-0 bg-white/30" />
                <div
                  className="absolute inset-y-0 left-0 bg-success transition-[width] duration-300"
                  style={{
                    width: `${
                      data.status === 'active'
                        ? round(data.progress * 100, 2)
                        : data.status === 'completed'
                          ? 100
                          : 0
                    }%`,
                  }}
                />
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

const getIconAnchorName = (index: number) => `--timeline-item-icon-${index}`

type TimelineItemProps = {
  data: TimelineItemData
  iconAnchorName?: string
}

const TimelineItem = ({data, iconAnchorName}: TimelineItemProps) => {
  const Icon = {
    completed: CheckIcon,
    active: ActivityIcon,
    upcoming: CircleIcon,
  }[data.status]

  const iconContainerVariants = cva(
    'flex size-10 items-center justify-center rounded-full ',
    {
      variants: {
        status: {
          completed: 'bg-success text-success-foreground',
          active:
            'animate-[timeline-glow_2s_ease-in-out_infinite] bg-success text-success-foreground',
          upcoming: 'bg-primary text-primary-foreground',
        },
      },
    },
  )

  return (
    <div className="flex flex-col items-center">
      <div
        style={{anchorName: iconAnchorName}}
        className={iconContainerVariants({status: data.status})}
      >
        <Icon className="size-4" />
      </div>

      <div className="mt-3 flex flex-row items-center gap-2 font-bold text-md">
        <p>{data.label}</p>
        {data.requiredUnit && (
          <Tooltip>
            <TooltipTrigger>
              <LockIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>
              In order to participate you must hold a token with policy ID{' '}
              {data.requiredUnit}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className="mt-1 text-muted-foreground text-sm">
        {formatDateTime(data.time)}
      </p>
      {data.additionalLabel && (
        <p className="mt-1 text-muted-foreground text-sm">
          {data.additionalLabel}
        </p>
      )}
    </div>
  )
}
