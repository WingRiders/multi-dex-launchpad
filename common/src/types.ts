import {integer, type TxInput, type TxOutput} from '@meshsdk/common'
import type {SetRequired} from 'type-fest'

export type TokenMetadata = {
  subject: string
  description?: string
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

export const dexToMeshData = (dex: Dex) =>
  integer(dex === 'WingRidersV2' ? 0 : 1)

export type SetNullable<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? T[P] | null : T[P]
}

export type RefScriptUtxo = {
  input: TxInput
  output: SetRequired<TxOutput, 'scriptRef' | 'scriptHash'>
  scriptSize: number
}
