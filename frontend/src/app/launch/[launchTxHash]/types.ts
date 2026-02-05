import type {TRPC} from '@/trpc/client'

export type Node = TRPC['userNodes']['~types']['output'][number]
