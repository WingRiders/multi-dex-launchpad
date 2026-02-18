'use client'

import {useQuery} from '@tanstack/react-query'
import {ArrowUpRightIcon, Trash2Icon} from 'lucide-react'
import Link from 'next/link'
import {useShallow} from 'zustand/shallow'
import {AssetQuantity} from '@/components/asset-quantity'
import {CancelledLaunchedBadge} from '@/components/cancelled-launched-badge'
import {OnlyWithWallet} from '@/components/only-with-wallet'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {useTRPC} from '@/trpc/client'
import type {UserLaunch} from '@/types'
import {isLaunchDraftStageAfter} from './create/helpers'
import {useCreateLaunchStore} from './create/store'
import {type LaunchDraft, LaunchDraftStage} from './create/types'

type UserLaunchesListProps = {
  address: string
}

const UserLaunchesList = ({address}: UserLaunchesListProps) => {
  const trpc = useTRPC()
  const {data: createdLaunches} = useQuery(
    trpc.launchesOwnedBy.queryOptions({ownerBech32Address: address}),
  )

  const {draft, deleteDraft} = useCreateLaunchStore(
    useShallow(({draft, deleteDraft}) => ({draft, deleteDraft})),
  )

  if ((!createdLaunches || createdLaunches.length === 0) && !draft) return null

  const handleDeleteDraft = () => {
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
    <div className="mt-8 space-y-4">
      <h2 className="font-bold text-4xl">My Launches</h2>
      <ul className="flex flex-col gap-3">
        {draft && (
          <DraftLaunchItem draft={draft} onDelete={handleDeleteDraft} />
        )}
        {createdLaunches?.map((launch) => (
          <CreatedLaunchItem key={launch.txHash} launch={launch} />
        ))}
      </ul>
    </div>
  )
}

type DraftLaunchItemProps = {
  draft: LaunchDraft
  onDelete: () => void
}

const DraftLaunchItem = ({draft, onDelete}: DraftLaunchItemProps) => {
  return (
    <LaunchItemContainer>
      <div className="flex flex-1 flex-row items-center justify-between gap-2 self-stretch md:self-auto">
        <Link
          href="/create"
          className="min-w-0 flex-1 font-semibold hover:underline"
        >
          {isLaunchDraftStageAfter(draft, LaunchDraftStage.PROJECT_INFORMATION)
            ? draft.projectInformation.title
            : 'Untitled launch'}

          <Badge variant="secondary" className="ml-2">
            Draft
          </Badge>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onDelete} aria-label="Delete draft">
          <Trash2Icon className="size-4" />
          Delete draft
        </Button>

        <Button asChild size="sm" variant="ghost">
          <Link href="/create">
            Continue editing
            <ArrowUpRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </LaunchItemContainer>
  )
}

type CreatedLaunchItemProps = {
  launch: UserLaunch
}

const CreatedLaunchItem = ({launch}: CreatedLaunchItemProps) => {
  return (
    <LaunchItemContainer>
      <div className="flex flex-1 flex-row items-center justify-between gap-2 self-stretch md:self-auto">
        <Link
          href={`/launch/${launch.txHash}`}
          className="min-w-0 flex-1 font-semibold hover:underline"
        >
          {launch.title}

          {launch.isCancelled && <CancelledLaunchedBadge className="ml-2" />}
        </Link>
        <span className="flex items-center gap-2 text-muted-foreground text-sm">
          <AssetQuantity
            unit={launch.projectToken}
            quantity={launch.totalTokens}
          />
        </span>
      </div>

      <Button asChild size="sm" variant="ghost">
        <Link href={`/launch/${launch.txHash}`}>
          View details
          <ArrowUpRightIcon className="size-4" />
        </Link>
      </Button>
    </LaunchItemContainer>
  )
}

const LaunchItemContainer = ({children}: {children: React.ReactNode}) => {
  return (
    <li className="flex flex-col items-start gap-2 rounded-lg border border-border/60 bg-card px-4 py-3 md:flex-row md:items-center">
      {children}
    </li>
  )
}

export const UserLaunches = () => {
  return (
    <OnlyWithWallet>
      {(connectedWallet) => (
        <UserLaunchesList address={connectedWallet.address} />
      )}
    </OnlyWithWallet>
  )
}
