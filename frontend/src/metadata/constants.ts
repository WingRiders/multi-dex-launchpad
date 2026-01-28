import type {TokenMetadata} from '@wingriders/multi-dex-launchpad-common'
import {env} from '@/config'

export const ADA_METADATA: TokenMetadata = {
  ...(env('NEXT_PUBLIC_NETWORK') === 'preprod'
    ? {description: 'Testnet ADA', ticker: 'tADA', name: 'tADA'}
    : {description: 'Cardano ADA', ticker: 'ADA', name: 'ADA'}),
  subject: '',
  symbol: '₳',
  decimals: 6,
}
