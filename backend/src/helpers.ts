import type {Point, Value} from '@cardano-ogmios/schema'
import type {Asset} from '@meshsdk/common'
import {createUnit, LOVELACE_UNIT} from '@wingriders/multi-dex-launchpad-common'
import {config} from './config'

export const originPoint = {
  mainnet: {
    // Shelley initial block
    id: 'aa83acbf5904c0edfe4d79b3689d3d00fcfc553cf360fd2229b98d464c28e9de',
    slot: 4492800,
    height: 4490511,
  },
  preprod: {
    // First launchpad https://preprod.cexplorer.io/tx/644c8fb4ba95d390cdbfb038c0a3850035dc3cab6fc0073f358c4e8e1c08a9c6
    // In block https://preprod.cexplorer.io/block/457ef74b4b2f298946cf2b2daafebcf22ba7b69bbfc4dfe7e89db9af45ddafa1
    // Origin point need to be 1 block before that
    // https://preprod.cexplorer.io/block/585901a44ecfa55429b10b12763c08f00a687c800f2cf719c9de57d737fa069f
    id: '585901a44ecfa55429b10b12763c08f00a687c800f2cf719c9de57d737fa069f',
    slot: 113846266,
    height: 4365014,
  },
}[config.NETWORK]

export const tipToSlot = (tip: Point | 'origin') =>
  tip === 'origin' ? originPoint.slot : tip.slot

export const ogmiosValueToMeshAssets = (
  value: Value,
  {
    includeAda = false,
    includeZero = false,
  }: {includeAda?: boolean; includeZero?: boolean} = {},
): Asset[] =>
  Object.entries(value).flatMap(([policyId, assets]) =>
    Object.entries(assets).flatMap(([assetName, quantity]) => {
      if (policyId === 'ada' && !includeAda) return []
      if (quantity === 0n && !includeZero) return []
      return {
        unit:
          policyId === 'ada' ? LOVELACE_UNIT : createUnit(policyId, assetName),
        quantity: quantity.toString(),
      }
    }),
  )
