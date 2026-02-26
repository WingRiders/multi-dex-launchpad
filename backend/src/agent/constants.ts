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

// Max reclaimable per tx is 23; we cap at 20 to leave headroom since 3 txs are required anyway
export const SEPARATORS_TO_RECLAIM = 20

export const COMMIT_FOLDING_BATCH_SIZE = 50 // TODO Adjust based on performance testing

// TODO: figure out a correct value
//       that can be constructed dynamically probably
//       for simplicity we always fold over a constant number of nodes
// maximum number of nodes that can be folded over in one transaction
export const MAX_NODES_FOR_REWARDS_FOLD = 10
