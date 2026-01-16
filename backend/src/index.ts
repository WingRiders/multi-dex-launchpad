import {startAgent} from './agent'
import {getOgmiosContext} from './agent/ogmios/ogmios'
import {initializeTxSubmissionClient} from './agent/ogmios/tx-submission-client'
import {isAgentMode} from './config'
import {startServer} from './server'

const start = async () => {
  startServer()
  await getOgmiosContext()
  initializeTxSubmissionClient()
  if (isAgentMode) startAgent()
}

// TODO: catch errors from ensure, and probably all other errors as well
await start()
