import {
  generateConstantContracts,
  SUNDAE_POOL_SCRIPT_HASH,
  WR_POOL_SYMBOL,
  WR_POOL_VALIDATOR_HASH,
} from '@wingriders/multi-dex-launchpad-common'
import {config} from '../config'

export const CONSTANT_CONTRACTS = await generateConstantContracts({
  wrPoolSymbol: WR_POOL_SYMBOL[config.NETWORK],
  wrPoolValidatorHash: WR_POOL_VALIDATOR_HASH[config.NETWORK],
  sundaePoolScriptHash: SUNDAE_POOL_SCRIPT_HASH[config.NETWORK],
})

// maximum number of separators that can be inserted in one transaction
export const SEPARATORS_TO_INSERT = 58

export const COMMIT_FOLDING_BATCH_SIZE = 50 // TODO Adjust based on performance testing
