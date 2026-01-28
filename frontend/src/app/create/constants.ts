import {SUPPORTED_RAISING_TOKENS_BY_NETWORK} from '@wingriders/multi-dex-launchpad-common'
import {env} from '@/config'

export const SUPPORTED_RAISING_TOKENS_UNITS =
  SUPPORTED_RAISING_TOKENS_BY_NETWORK[env('NEXT_PUBLIC_NETWORK')]
