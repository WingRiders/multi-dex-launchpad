import type {LaunchTimeStatus} from '@wingriders/multi-dex-launchpad-common'
import {
  differenceInMilliseconds,
  getTime,
  hoursToMilliseconds,
  isAfter,
  isBefore,
} from 'date-fns'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {Launch} from '@/types'

export const useTime = (updateInterval?: number) => {
  const [time, setTime] = useState(Date.now())
  const activeScheduledUpdates = useRef<Map<number, NodeJS.Timeout>>(new Map())

  const scheduleTimeUpdate = useCallback((at: Date | number) => {
    const now = Date.now()
    const atTime = getTime(at)
    if (!isAfter(atTime, now) || activeScheduledUpdates.current.has(atTime)) {
      return
    }

    const delay = differenceInMilliseconds(atTime, now)
    if (delay < hoursToMilliseconds(12)) {
      const handle = setTimeout(() => {
        activeScheduledUpdates.current.delete(atTime)
        setTime(Date.now())
      }, delay)
      activeScheduledUpdates.current.set(atTime, handle)
    }
  }, [])

  const clearScheduledTimeUpdate = useCallback((at: Date | number) => {
    const atTime = getTime(at)
    const handle = activeScheduledUpdates.current.get(atTime)
    if (handle) {
      clearTimeout(handle)
      activeScheduledUpdates.current.delete(atTime)
    }
  }, [])

  const clearAllScheduledTimeUpdates = useCallback(() => {
    activeScheduledUpdates.current.forEach(clearTimeout)
    activeScheduledUpdates.current.clear()
  }, [])

  const updateTime = useCallback(() => {
    const newTime = Date.now()
    setTime(newTime)
    // returning newTime in case it's needed before the state gets updated in the next render
    return newTime
  }, [])

  useEffect(() => {
    const handle =
      updateInterval != null
        ? setInterval(() => setTime(Date.now()), updateInterval)
        : undefined
    return () => {
      if (handle) clearInterval(handle)
      clearAllScheduledTimeUpdates()
    }
  }, [clearAllScheduledTimeUpdates, updateInterval])

  return {
    time,
    updateTime,
    scheduleTimeUpdate,
    clearScheduledTimeUpdate,
    clearAllScheduledTimeUpdates,
  }
}

export const useUpdatedTime = (updateAt: number[], updateInterval?: number) => {
  const {time, scheduleTimeUpdate, clearAllScheduledTimeUpdates} =
    useTime(updateInterval)

  useEffect(() => {
    updateAt.forEach(scheduleTimeUpdate)
    return clearAllScheduledTimeUpdates
  }, [clearAllScheduledTimeUpdates, scheduleTimeUpdate, updateAt])

  return time
}

export const getLaunchTimeStatus = (
  launch: Pick<Launch, 'startTime' | 'endTime'>,
  time: number,
): LaunchTimeStatus => {
  if (isBefore(time, launch.startTime)) return 'upcoming'
  if (isAfter(time, launch.endTime)) return 'past'
  return 'active'
}

export const useLaunchTimeStatus = (
  launch: Pick<Launch, 'startTime' | 'endTime'>,
): LaunchTimeStatus => {
  const startTime = getTime(launch.startTime)
  const endTime = getTime(launch.endTime)

  const time = useUpdatedTime(
    useMemo(() => [startTime, endTime], [startTime, endTime]),
  )

  return getLaunchTimeStatus(launch, time)
}
