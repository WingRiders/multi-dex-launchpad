import type {Value} from '@cardano-ogmios/schema'
import {
  type GeneratedPolicy,
  SUNDAE_POOL_SCRIPT_HASH,
  WR_POOL_SYMBOL,
} from '@wingriders/multi-dex-launchpad-common'
import {config} from '../config'
import type {launchScriptHashes} from '../interesting-launches'
import {CONSTANT_CONTRACTS, WR_POOL_VALIDITY_ASSET_NAME} from './constants'

/**
 * Checks whether a TxOutput contains the required validity token for
 * the given validator type, ensuring the expected minting policy was successfully run.
 * Also rejects policies.
 */
export const passesValidityToken = (
  {contracts, type}: (typeof launchScriptHashes)[string],
  value: Value,
): boolean => {
  // These contracts don't require a validity token
  if (
    type === 'refScriptCarrier' ||
    type === 'rewardsHolder' ||
    type === 'finalProjectTokensHolder'
  )
    return true

  switch (type) {
    case 'node':
      return (
        value[contracts.nodePolicy.hash]?.[contracts.nodeValidator.hash] === 1n
      )
    case 'firstProjectTokensHolder':
      return (
        value[contracts.tokensHolderPolicy.hash]?.[
          contracts.tokensHolderFirstValidator.hash
        ] === 1n
      )
    case 'commitFold':
      return (
        value[contracts.commitFoldPolicy.hash]?.[
          contracts.commitFoldValidator.hash
        ] === 1n
      )
    case 'rewardsFold':
      return (
        value[contracts.rewardsFoldPolicy.hash]?.[
          contracts.rewardsFoldValidator.hash
        ] === 1n
      )
    case 'failProof':
      return (
        value[CONSTANT_CONTRACTS.failProofPolicy.hash]?.[
          CONSTANT_CONTRACTS.failProofValidator.hash
        ] === 1n
      )
    case 'poolProof':
      return (
        value[CONSTANT_CONTRACTS.poolProofPolicy.hash]?.[
          CONSTANT_CONTRACTS.poolProofValidator.hash
        ] === 1n
      )
    case 'wrPool':
      return (
        value[WR_POOL_SYMBOL[config.NETWORK]]?.[WR_POOL_VALIDITY_ASSET_NAME] ===
        1n
      )
    case 'sundaePool': {
      const v = value[SUNDAE_POOL_SCRIPT_HASH[config.NETWORK]]
      return (
        typeof v === 'object' &&
        v != null &&
        Object.keys(v).length === 1 &&
        Object.values(v)[0] === 1n
      )
    }
    default: {
      // Policies on utxos are definitely not correct for launchpad
      const _: GeneratedPolicy = type
      return false
    }
  }
}
