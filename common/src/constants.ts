import type {LanguageVersion, Unit} from '@meshsdk/common'
import type {Network} from './helpers/network'
import {LOVELACE_UNIT} from './helpers/unit'

// Validity start of a transaction must be before the last block on the blockchain, using 2 minutes should be enough to be safe
export const DEFAULT_TX_VALIDITY_START_BACKDATE_SLOTS = 2 * 60 // 2 minutes
export const DEFAULT_TX_VALIDITY_START_BACKDATE_MS =
  DEFAULT_TX_VALIDITY_START_BACKDATE_SLOTS * 1000

// 1 hour after the validity start
export const DEFAULT_TX_TTL_SLOTS = 60 * 60 // 1 hour
export const DEFAULT_TX_TTL_MS = DEFAULT_TX_TTL_SLOTS * 1000

export const SCRIPT_HASH_LENGTH = 28

export enum PlutusScriptVersion {
  PlutusScriptV1 = 'PlutusScriptV1',
  PlutusScriptV2 = 'PlutusScriptV2',
  PlutusScriptV3 = 'PlutusScriptV3',
}

export const PLUTUS_SCRIPT_VERSION_PREFIX = {
  [PlutusScriptVersion.PlutusScriptV1]: '01',
  [PlutusScriptVersion.PlutusScriptV2]: '02',
  [PlutusScriptVersion.PlutusScriptV3]: '03',
}

export const PLUTUS_SCRIPT_VERSION_TO_LANGUAGE: Record<
  PlutusScriptVersion,
  LanguageVersion
> = {
  [PlutusScriptVersion.PlutusScriptV1]: 'V1',
  [PlutusScriptVersion.PlutusScriptV2]: 'V2',
  [PlutusScriptVersion.PlutusScriptV3]: 'V3',
}

export const SPLIT_BPS_BASE = 10_000

export const MAX_LENGTHS = {
  title: 64,
  description: 300,
  url: 100,
  logoUrl: 300,
}

// Token with such policy cannot be minted
export const DISABLED_TIER_CS =
  '03d9bf874aa50cb845f4dcf011a223ed4b1ccd51b485990baa79d676'

export const SUPPORTED_RAISING_TOKENS_BY_NETWORK: Record<Network, Unit[]> = {
  preprod: [
    LOVELACE_UNIT,
    '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344', // iUSD
    '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564', // Djed
  ],
  mainnet: [
    LOVELACE_UNIT,
    'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069555344', // iUSD
    '8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344', // Djed
  ],
}
