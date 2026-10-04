import type {StaticImageData} from 'next/image'
import oneAmIcon from './walletIcons/1am.svg'
import eternlIcon from './walletIcons/eternl.png'
import laceIcon from './walletIcons/lace.svg'
import nufiIcon from './walletIcons/nufi.svg'
import typhonIcon from './walletIcons/typhon.svg'

export const supportedWalletTypes = [
  'eternl',
  'nufi',
  'lace',
  'typhon',
  '1am',
] as const
export type SupportedWalletType = (typeof supportedWalletTypes)[number]

export type WalletInfo = {
  name: string
  icon: StaticImageData | string
  id: string // matches the ID in MeshJS and the CIP-30 API field name in window.cardano
}

export const supportedWalletsInfo: Record<SupportedWalletType, WalletInfo> = {
  eternl: {
    name: 'Eternl',
    icon: eternlIcon,
    id: 'eternl',
  },
  nufi: {
    name: 'NuFi',
    icon: nufiIcon,
    id: 'nufi',
  },
  lace: {
    name: 'Lace',
    icon: laceIcon,
    id: 'lace',
  },
  typhon: {
    name: 'Typhon',
    icon: typhonIcon,
    id: 'typhoncip30',
  },
  '1am': {
    name: '1AM',
    icon: oneAmIcon,
    id: '1am',
  },
}
