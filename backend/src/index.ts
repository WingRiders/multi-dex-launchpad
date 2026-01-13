import {startAgent} from './agent'
import {startAggregator} from './aggregator'
import {isAgentMode, isAggregatorMode} from './config'
import {startServer} from './server'

const start = async () => {
  startServer()
  if (isAggregatorMode) startAggregator()
  if (isAgentMode) startAgent()
}

await start()
