import type {TRPC} from '@/trpc/client'

export type Launch = TRPC['launches']['~types']['output'][number]
