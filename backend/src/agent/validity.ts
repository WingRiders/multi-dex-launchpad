import type {Value} from '@cardano-ogmios/schema'
import {GeneratedPolicy} from '@wingriders/multi-dex-launchpad-common'
import type {launchScriptHashes} from '../interesting-launches'
import {CONSTANT_CONTRACTS} from './constants'

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
      // TODO: wr token
      return true
    case 'sundaePool':
      // TODO: sundae token
      return true
    default: {
      // Policies on utxos are definitely not correct for launchpad
      const _: GeneratedPolicy = type
      return false
    }
  }
}
