import React from 'react'

type ClientOnlyProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const ClientOnly = ({children, fallback = null}: ClientOnlyProps) => {
  return useHydrated() ? children : fallback
}

/**
 * Return a boolean indicating if the JS has been hydrated already.
 * When doing Server-Side Rendering, the result will always be false.
 * When doing Client-Side Rendering, the result will always be false on the
 * first render and true from then on. Even if a new component renders it will
 * always start with true.
 */
export const useHydrated = (): boolean => {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

function subscribe() {
  return () => {}
}
