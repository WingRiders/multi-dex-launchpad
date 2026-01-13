import type {Point} from '@cardano-ogmios/schema'
import {config} from './config'

export const originPoint = {
  mainnet: {
    // Shelley initial block
    id: 'aa83acbf5904c0edfe4d79b3689d3d00fcfc553cf360fd2229b98d464c28e9de',
    slot: 4492800,
    height: 4490511,
  },
  preprod: {
    // TODO Set when the first launchpad is created
    // Origin point need to be 1 block before that
    id: 'c6170f3fe6744a6b9f06c7aefb093e32e7c1804bb1fb2e9a02653e92b7eb020b',
    slot: 108345461,
    height: 4162219,
  },
}[config.NETWORK]

export const tipToSlot = (tip: Point | 'origin') =>
  tip === 'origin' ? originPoint.slot : tip.slot
