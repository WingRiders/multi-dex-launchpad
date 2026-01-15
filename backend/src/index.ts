import {startAgent} from './agent'
import {isAgentMode} from './config'
import {startServer} from './server'

const start = async () => {
  startServer()
  if (isAgentMode) startAgent()
}

// TODO: catch errors from ensure, and probably all other errors as well
await start()
