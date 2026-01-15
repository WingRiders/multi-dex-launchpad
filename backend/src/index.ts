import {startAgent} from './agent'
import {startAggregator} from './aggregator'
import {isAgentMode, isAggregatorMode} from './config'
import {startServer} from './server'

const start = async () => {
  startServer()
  if (isAggregatorMode) startAggregator()
  if (isAgentMode) startAgent()
}

// TODO: catch errors from ensure, and probably all other errors as well
await start()
