import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {config, isAggregatorMode} from '../config'
import {ensureDbMigrated} from '../db/migrate-db'
import {startChainSyncClient} from './ogmios/chain-sync'
import {getOgmiosContext} from './ogmios/ogmios'

export const startAggregator = async () => {
  ensure(isAggregatorMode, {mode: config.MODE}, 'Unsupported MODE')
  await getOgmiosContext()
  await ensureDbMigrated()
  startChainSyncClient()
}
