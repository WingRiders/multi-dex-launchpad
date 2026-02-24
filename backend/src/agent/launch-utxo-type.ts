import {
  ensure,
  type GeneratedPolicy,
  type GeneratedValidator,
} from '@wingriders/multi-dex-launchpad-common'
import type {ExtractStrict} from 'type-fest'
import {RefScriptCarrierType} from '../../prisma/generated/client'

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

export type RefScriptCarrierLaunchUtxoType = ExtractStrict<
  LaunchUtxoType,
  | 'nodeValidatorRefScriptCarrier'
  | 'firstProjectTokensHolderValidatorRefScriptCarrier'
  | 'finalProjectTokensHolderValidatorRefScriptCarrier'
  | 'commitFoldValidatorRefScriptCarrier'
  | 'rewardsFoldValidatorRefScriptCarrier'
  | 'nodePolicyRefScriptCarrier'
  | 'projectTokensHolderPolicyRefScriptCarrier'
  | 'commitFoldPolicyRefScriptCarrier'
  | 'rewardsFoldPolicyRefScriptCarrier'
>

export const refScriptCarrierDbTypeFromUtxoType: Record<
  RefScriptCarrierLaunchUtxoType,
  RefScriptCarrierType
> = {
  nodeValidatorRefScriptCarrier: RefScriptCarrierType.NODE_VALIDATOR,
  nodePolicyRefScriptCarrier: RefScriptCarrierType.NODE_POLICY,
  firstProjectTokensHolderValidatorRefScriptCarrier:
    RefScriptCarrierType.FIRST_PROJECT_TOKENS_HOLDER_VALIDATOR,
  projectTokensHolderPolicyRefScriptCarrier:
    RefScriptCarrierType.PROJECT_TOKENS_HOLDER_POLICY,
  finalProjectTokensHolderValidatorRefScriptCarrier:
    RefScriptCarrierType.FINAL_PROJECT_TOKENS_HOLDER_VALIDATOR,
  commitFoldValidatorRefScriptCarrier:
    RefScriptCarrierType.COMMIT_FOLD_VALIDATOR,
  commitFoldPolicyRefScriptCarrier: RefScriptCarrierType.COMMIT_FOLD_POLICY,
  rewardsFoldValidatorRefScriptCarrier:
    RefScriptCarrierType.REWARDS_FOLD_VALIDATOR,
  rewardsFoldPolicyRefScriptCarrier: RefScriptCarrierType.REWARDS_FOLD_POLICY,
}

export const isRefScriptCarrierUtxoType = (
  type: LaunchUtxoType,
): type is RefScriptCarrierLaunchUtxoType =>
  type in refScriptCarrierDbTypeFromUtxoType

export const refScriptCarrierUtxoTypeFromValidatorHashType = (
  refScriptType: GeneratedValidator | GeneratedPolicy,
): RefScriptCarrierLaunchUtxoType => {
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
