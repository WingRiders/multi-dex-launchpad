import type {Network} from '@wingriders/multi-dex-launchpad-common'
import {mainnetPoolContracts} from './mainnet'
import {preprodPoolContracts} from './preprod'

export const poolRefScriptsByNetwork = {
  preprod: preprodPoolContracts,
  mainnet: mainnetPoolContracts,
} satisfies Record<
  Network,
  typeof preprodPoolContracts | typeof mainnetPoolContracts
>
