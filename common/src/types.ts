export type TokenMetadata = {
  subject: string
  description: string
  name: string
  ticker?: string
  symbol?: string
  url?: string
  logo?: string
  decimals?: number
}

export const launchTimeStatuses = ['past', 'active', 'upcoming'] as const
export type LaunchTimeStatus = (typeof launchTimeStatuses)[number]
