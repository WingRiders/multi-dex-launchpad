import {Badge} from './ui/badge'

type CancelledLaunchedBadgeProps = {
  className?: string
}

export const CancelledLaunchedBadge = ({
  className,
}: CancelledLaunchedBadgeProps) => {
  return (
    <Badge variant="destructive" className={className}>
      Cancelled
    </Badge>
  )
}
