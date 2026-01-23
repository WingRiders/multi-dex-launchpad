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

export const tiers = ['presale', 'default'] as const
export type Tier = (typeof tiers)[number]

export const dexes = ['WingRidersV2', 'SundaeSwapV3'] as const
export type Dex = (typeof dexes)[number]
