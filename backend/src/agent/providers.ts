import {OfflineFetcher, OgmiosProvider} from '@meshsdk/core'
import * as coreCsl from '@meshsdk/core-csl'
import {config} from '../config'

export const ogmiosSubmitter = new OgmiosProvider(
  `http://${config.OGMIOS_HOST}:${config.OGMIOS_PORT}`,
)

// TODO:
// We need to maintain offline fetcher state
// we can port the ogmios fetcher maybe?
export const fetcher = new OfflineFetcher(config.NETWORK)

export const evaluator = new coreCsl.OfflineEvaluator(fetcher, config.NETWORK)
