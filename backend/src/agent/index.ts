import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {config, isAgentMode} from '../config'
import {ensureDbMigrated} from '../db/migrate-db'
import {prisma} from '../db/prisma-client'
import {logger} from '../logger'
import {startChainSyncClient} from './ogmios/chain-sync'
import {getOgmiosContext} from './ogmios/ogmios'

export const startAgent = async () => {
  ensure(isAgentMode, {mode: config.MODE}, 'Unsupported MODE')
  await getOgmiosContext()
  await ensureDbMigrated()
  startChainSyncClient()
}
