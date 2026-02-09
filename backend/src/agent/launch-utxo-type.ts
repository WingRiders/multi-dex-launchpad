import {
  ensure,
  type GeneratedPolicy,
  type GeneratedValidator,
} from '@wingriders/multi-dex-launchpad-common'

export type LaunchUtxoType =
  | 'nodeValidatorRefScriptCarrier'
  | 'nodePolicyRefScriptCarrier'
  | 'firstProjectTokensHolderValidatorRefScriptCarrier'
  | 'projectTokensHolderPolicyRefScriptCarrier'
  | 'finalProjectTokensHolderValidatorRefScriptCarrier'
  | 'commitFoldValidatorRefScriptCarrier'
  | 'commitFoldPolicyRefScriptCarrier'
  | 'rewardsFoldValidatorRefScriptCarrier'
  | 'rewardsFoldPolicyRefScriptCarrier'
  | 'node'
  | 'rewardsHolder'
  | 'firstProjectTokensHolder'
  | 'finalProjectTokensHolder'
  | 'commitFold'
  | 'rewardsFold'
  | 'failProof'
  | 'wrPoolProof'
  | 'sundaePoolProof'
  | 'wrPool'
  | 'sundaePool'

export const refScriptCarrierUtxoTypeFromValidatorHashType = (
  refScriptType: GeneratedValidator | GeneratedPolicy,
): LaunchUtxoType => {
  switch (refScriptType) {
    case 'node':
      return 'nodeValidatorRefScriptCarrier'
    case 'firstProjectTokensHolder':
      return 'firstProjectTokensHolderValidatorRefScriptCarrier'
    case 'finalProjectTokensHolder':
      return 'finalProjectTokensHolderValidatorRefScriptCarrier'
    case 'commitFold':
      return 'commitFoldValidatorRefScriptCarrier'
    case 'rewardsFold':
      return 'rewardsFoldValidatorRefScriptCarrier'
    case 'nodePolicy':
      return 'nodePolicyRefScriptCarrier'
    case 'projectTokensHolderPolicy':
      return 'projectTokensHolderPolicyRefScriptCarrier'
    case 'commitFoldPolicy':
      return 'commitFoldPolicyRefScriptCarrier'
    case 'rewardsFoldPolicy':
      return 'rewardsFoldPolicyRefScriptCarrier'
    default: {
      const _: never = refScriptType
      ensure(false, {refScriptType}, 'Unknown ref script type')
    }
  }
}
