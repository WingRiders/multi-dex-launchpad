import {config, isAggregatorMode} from '../config'
import {ensureDBMigrated} from '../db/migrate-db'
import {ensure} from '../ensure'
import {startChainSyncClient} from './ogmios/chain-sync'
import {getOgmiosContext} from './ogmios/ogmios'

export const startAggregator = async () => {
  ensure(isAggregatorMode, {mode: config.MODE}, 'Unsupported MODE')
  await getOgmiosContext()
  await ensureDBMigrated()
  startChainSyncClient()
}
