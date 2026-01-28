'use client'

import {Trash2Icon} from 'lucide-react'
import Link from 'next/link'
import {useShallow} from 'zustand/shallow'
import {ClientOnly} from '@/components/client-only'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {isLaunchDraftStageAfter} from './helpers'
import {useCreateLaunchStore} from './store'
import {LaunchDraftStage} from './types'

export const CurrentDraft = () => {
  return (
    <ClientOnly>
      <CurrentDraftContent />
    </ClientOnly>
  )
}

const CurrentDraftContent = () => {
  const {draft, deleteDraft} = useCreateLaunchStore(
    useShallow(({draft, deleteDraft}) => ({draft, deleteDraft})),
  )

  if (!draft) {
    return null
  }

  const title = isLaunchDraftStageAfter(
    draft,
    LaunchDraftStage.PROJECT_INFORMATION,
  )
    ? draft.projectInformation.title
    : 'Untitled launch'

  const handleDelete = () => {
    // TODO: better UI for confirming the deletion
    if (
      confirm(
        'Are you sure you want to delete this draft? This action cannot be undone.',
      )
    ) {
      deleteDraft()
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            {title}
            <Badge variant="secondary">Draft</Badge>
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete draft"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardFooter>
        <Button asChild>
          <Link href="/create">Continue Draft</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
