import {startAgent} from './agent'
import {getOgmiosContext} from './agent/ogmios/ogmios'
import {initializeTxSubmissionClient} from './agent/ogmios/tx-submission-client'
import {isAgentMode, isServerMode} from './config'
import {startServer} from './server'
import {tokensMetadataLoop} from './token-registry'

const start = async () => {
  startServer()
  await getOgmiosContext()
  initializeTxSubmissionClient()
  if (isAgentMode) startAgent()
  if (isServerMode) tokensMetadataLoop()
}

await start()
