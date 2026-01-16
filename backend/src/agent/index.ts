import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {config, isAgentMode} from '../config'
import {ensureDbMigrated} from '../db/migrate-db'
import {startChainSyncClient} from './ogmios/chain-sync'

export const startAgent = async () => {
  ensure(isAgentMode, {mode: config.MODE}, 'Unsupported MODE')
  await ensureDbMigrated()
  startChainSyncClient()
}
