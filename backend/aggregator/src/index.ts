import {isAggregatorMode} from './config'
import {ensureDBMigrated} from './db/migrate-db'
import {startChainSyncClient} from './ogmios/chain-sync'
import {getOgmiosContext} from './ogmios/ogmios'
import {startServer} from './server'

await getOgmiosContext()

if (isAggregatorMode) {
  await ensureDBMigrated()

  startChainSyncClient()
}

startServer()
