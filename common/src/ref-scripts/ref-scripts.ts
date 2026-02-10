import type {Network} from '../helpers/network'
import {mainnetConstantContracts} from './mainnet'
import {preprodConstantContracts} from './preprod'

export const constantRefScriptsByNetwork = {
  preprod: preprodConstantContracts,
  mainnet: mainnetConstantContracts,
} satisfies Record<
  Network,
  typeof preprodConstantContracts | typeof mainnetConstantContracts
>
