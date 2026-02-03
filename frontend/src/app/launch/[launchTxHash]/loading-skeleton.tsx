import {Skeleton} from '@/components/ui/skeleton'

export const LoadingSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Header: title, description, token */}
      <div className="flex flex-row items-center justify-between space-x-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-10 w-3/4 max-w-md" />
          <Skeleton className="h-7 w-2/3 max-w-lg" />
        </div>
        <Skeleton className="size-16 shrink-0 rounded-full" />
      </div>

      {/* Link buttons */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>

      {/* Timeline */}
      <Skeleton className="h-30 w-full" />

      {/* Logo + Contributing grid */}
      <div className="grid grid-cols-5 gap-8">
        <Skeleton className="col-span-3 h-[450px] w-full" />
        <Skeleton className="col-span-2 h-full w-full" />
      </div>

      {/* Allocation */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Token information */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}
