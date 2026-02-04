import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {config, isAgentMode} from '../config'
import {ensureDbMigrated} from '../db/migrate-db'
import {startChainSyncClient} from './ogmios/chain-sync'
import {updateFetcherProtocolParametersFromOgmios} from './providers'
import {initWallet} from './wallet'

export const startAgent = async () => {
  ensure(isAgentMode, {mode: config.MODE}, 'Unsupported MODE')
  await ensureDbMigrated()
  if (config.WALLET_MNEMONIC != null) {
    await initWallet()
    await updateFetcherProtocolParametersFromOgmios()
  }
  startChainSyncClient()
}
