import type {Dex} from '@wingriders/multi-dex-launchpad-common'
import type {StaticImageData} from 'next/image'
import sundaeSwapV3Icon from '@/icons/dexes/sundaeSwapV3.svg'
import wingRidersV2Icon from '@/icons/dexes/wingRidersV2.svg'

export const SUPPORTED_DEXES_INFO: Record<
  Dex,
  {
    name: string
    icon: StaticImageData
    color: string
  }
> = {
  WingRidersV2: {
    name: 'WingRiders V2',
    icon: wingRidersV2Icon,
    color: '#FBB03B',
  },
  SundaeSwapV3: {
    name: 'SundaeSwap V3',
    icon: sundaeSwapV3Icon,
    color: '#AB46DA',
  },
}
