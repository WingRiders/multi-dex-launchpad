import {ExternalLinkIcon} from 'lucide-react'
import Link from 'next/link'
import {Button} from '@/components/ui/button'

type LaunchLinkProps = {
  label: string
  href?: string
}

export const LaunchLink = ({label, href}: LaunchLinkProps) => {
  const content = (
    <>
      {label}
      <ExternalLinkIcon className="size-4" />
    </>
  )
  return (
    <Button asChild={!!href} disabled={!href} variant="outline">
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-1"
          target="_blank"
          rel="noreferrer"
        >
          {label}
          <ExternalLinkIcon className="size-4" />
        </Link>
      ) : (
        content
      )}
    </Button>
  )
}
