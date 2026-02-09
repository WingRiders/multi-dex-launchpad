import {AlertCircleIcon} from 'lucide-react'
import type {ReactNode} from 'react'
import {Alert, AlertDescription, AlertTitle} from './ui/alert'

type ErrorAlertProps = {
  title?: string
  description?: ReactNode
  className?: string
}

export const ErrorAlert = ({
  title,
  description,
  className,
}: ErrorAlertProps) => {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircleIcon className="size-4" />
      {title != null && <AlertTitle>{title}</AlertTitle>}
      {description != null && (
        <AlertDescription className="break-all">{description}</AlertDescription>
      )}
    </Alert>
  )
}
