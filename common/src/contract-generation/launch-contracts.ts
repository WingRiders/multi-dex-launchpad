import {resolvePaymentKeyHash} from '@meshsdk/core'
import type {ConstantContracts, Contract} from '..'
import {applyParamsToScriptExport} from '../helpers/script'
import {commitFoldConfigToMeshData} from '../launch-configs/commit-fold-config'
import {commitFoldPolicyConfigToMeshData} from '../launch-configs/commit-fold-policy-config'
import type {LaunchConfig} from '../launch-configs/launch-config'
import {nodeConfigToMeshData} from '../launch-configs/node-config'
import {nodePolicyConfigToMeshData} from '../launch-configs/node-policy-config'
import {rewardsFoldConfigToMeshData} from '../launch-configs/rewards-fold-config'
import {rewardsFoldPolicyConfigToMeshData} from '../launch-configs/rewards-fold-policy-config'
import {rewardsHolderConfigToMeshData} from '../launch-configs/rewards-holder-config'
import {tokensHolderFinalConfigToMeshData} from '../launch-configs/tokens-holder-final-config'
import {tokensHolderFirstConfigToMeshData} from '../launch-configs/tokens-holder-first-config'
import {tokensHolderPolicyConfigToMeshData} from '../launch-configs/tokens-holder-policy-config'
import * as artifacts from '../on-chain/artifacts'

export type GeneratedContracts = {
  rewardsHolderValidator: Contract
  rewardsFoldPolicy: Contract
  nodePolicy: Contract
  commitFoldPolicy: Contract
  tokensHolderPolicy: Contract
  commitFoldValidator: Contract
  tokensHolderFinalValidator: Contract
  tokensHolderFirstValidator: Contract
  rewardsFoldValidator: Contract
  nodeValidator: Contract
}

export const generateLaunchContracts = async (
  launchConfig: LaunchConfig,
  constantScriptHashes: ConstantContracts,
): Promise<GeneratedContracts> => {
  const rewardsHolderValidator = await applyParamsToScriptExport(
    artifacts.parametricRewardsHolderValidator,
    [
      rewardsHolderConfigToMeshData({
        poolProofValidatorHash: constantScriptHashes.poolProofValidator.hash,
        poolProofSymbol: constantScriptHashes.poolProofPolicy.hash,
      }),
    ],
  )

  const rewardsFoldPolicy = await applyParamsToScriptExport(
    artifacts.parametricRewardsFoldPolicy,
    [rewardsFoldPolicyConfigToMeshData({starter: launchConfig.starter})],
  )

  const nodePolicy = await applyParamsToScriptExport(
    artifacts.parametricNodePolicy,
    [
      nodePolicyConfigToMeshData({
        starter: launchConfig.starter,
        ownerPubKeyHash: resolvePaymentKeyHash(launchConfig.ownerBech32Address),
        nodeAda: launchConfig.nodeAda,
      }),
    ],
  )

  const commitFoldPolicy = await applyParamsToScriptExport(
    artifacts.parametricCommitFoldPolicy,
    [
      commitFoldPolicyConfigToMeshData({
        starter: launchConfig.starter,
        endTime: launchConfig.endTime,
        nodeSymbol: nodePolicy.hash,
      }),
    ],
  )

  const tokensHolderPolicy = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderPolicy,
    [
      tokensHolderPolicyConfigToMeshData({
        owner: resolvePaymentKeyHash(launchConfig.ownerBech32Address),
        startTime: launchConfig.startTime,
        totalTokens: launchConfig.totalTokens,
        projectToken: launchConfig.projectToken,
        collateral: launchConfig.collateral,
        starter: launchConfig.starter,
        nodeSymbol: nodePolicy.hash,
      }),
    ],
  )

  const commitFoldValidator = await applyParamsToScriptExport(
    artifacts.parametricCommitFoldValidator,
    [
      commitFoldConfigToMeshData({
        starter: launchConfig.starter,
        commitFoldSymbol: commitFoldPolicy.hash,
        nodeSymbol: nodePolicy.hash,
        endTime: launchConfig.endTime,
        daoAdminPubKeyHash: launchConfig.daoAdminPubKeyHash,
      }),
    ],
  )

  const tokensHolderFinalValidator = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderFinalValidator,
    [
      tokensHolderFinalConfigToMeshData({
        ownerBech32Address: launchConfig.ownerBech32Address,
        wrPoolSymbol: launchConfig.wrPoolCurrencySymbol,
        wrPoolValidatorHash: launchConfig.wrPoolValidatorHash,
        wrFactoryValidatorHash: launchConfig.wrFactoryValidatorHash,
        sundaePoolScriptHash: launchConfig.sundaePoolScriptHash,
        sundaeFeeTolerance: launchConfig.sundaeFeeTolerance,
        sundaeSettingsCurrencySymbol: launchConfig.sundaeSettingsCurrencySymbol,
        poolProofValidatorHash: constantScriptHashes.failProofValidator.hash,
        vestingValidatorHash: launchConfig.vestingValidatorHash,
        vestingPeriodDuration: launchConfig.vestingPeriodDuration,
        vestingPeriodDurationToFirstUnlock:
          launchConfig.vestingPeriodDurationToFirstUnlock,
        vestingPeriodInstallments: launchConfig.vestingPeriodInstallments,
        vestingPeriodStart: launchConfig.vestingPeriodStart,
        daoFeeReceiverBech32Address: launchConfig.daoFeeReceiverBech32Address,
        raisingToken: launchConfig.raisingToken,
        projectToken: launchConfig.projectToken,
        starter: launchConfig.starter,
      }),
    ],
  )

  const tokensHolderFirstValidator = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderFirstValidator,
    [
      tokensHolderFirstConfigToMeshData({
        ownerBech32Address: launchConfig.ownerBech32Address,
        startTime: launchConfig.startTime,
        projectTokensHolderSymbol: tokensHolderPolicy.hash,
        starter: launchConfig.starter,
        endTime: launchConfig.endTime,
        daoAdminPubKeyHash: launchConfig.daoAdminPubKeyHash,
      }),
    ],
  )

  const rewardsFoldValidator = await applyParamsToScriptExport(
    artifacts.parametricRewardsFoldValidator,
    [
      rewardsFoldConfigToMeshData({
        starter: launchConfig.starter,
        ownerBech32Address: launchConfig.ownerBech32Address,
        nodeSymbol: nodePolicy.hash,
        rewardsFoldPolicy: rewardsFoldPolicy.hash,
        rewardsHolderValidatorHash: rewardsHolderValidator.hash,
        finalProjectTokensHolderValidatorHash: tokensHolderFinalValidator.hash,
        firstProjectTokensHolderValidatorHash: tokensHolderFirstValidator.hash,
        projectTokensHolderPolicy: tokensHolderPolicy.hash,
        projectToken: launchConfig.projectToken,
        raisingToken: launchConfig.raisingToken,
        presaleTierCs: launchConfig.presaleTierCs,
        tokensToDistribute: launchConfig.tokensToDistribute,
        endTime: launchConfig.endTime,
        oilAda: launchConfig.oilAda,
        commitFoldFeeAda: launchConfig.commitFoldFeeAda,
        splitBps: launchConfig.splitBps,
        daoFeeNumerator: launchConfig.daoFeeNumerator,
        daoFeeDenominator: launchConfig.daoFeeDenominator,
        daoFeeReceiverBech32Address: launchConfig.daoFeeReceiverBech32Address,
        raisedTokensPoolPartPercentage:
          launchConfig.raisedTokensPoolPartPercentage,
        collateral: launchConfig.collateral,
      }),
    ],
  )

  const nodeValidator = await applyParamsToScriptExport(
    artifacts.parametricNodeValidator,
    [
      nodeConfigToMeshData({
        starter: launchConfig.starter,
        nodeSymbol: nodePolicy.hash,
        rewardsFoldSymbol: rewardsFoldPolicy.hash,
        rewardsFoldValidatorHash: rewardsFoldValidator.hash,
        commitFoldSymbol: commitFoldPolicy.hash,
        commitFoldValidatorHash: commitFoldValidator.hash,
        tokensHolderSymbol: tokensHolderPolicy.hash,
        tokensHolderFirstValidatorHash: tokensHolderFirstValidator.hash,
        failProofSymbol: constantScriptHashes.failProofPolicy.hash,
        failProofValidatorHash: constantScriptHashes.failProofValidator.hash,
        presaleTierCs: launchConfig.presaleTierCs,
        presaleTierMinCommitment: launchConfig.presaleTierMinCommitment,
        presaleTierMaxCommitment: launchConfig.presaleTierMaxCommitment,
        presaleTierStartTime: launchConfig.presaleTierStartTime,
        defaultTierMinCommitment: launchConfig.defaultTierMinCommitment,
        defaultTierMaxCommitment: launchConfig.defaultTierMaxCommitment,
        defaultStartTime: launchConfig.defaultStartTime,
        startTime: launchConfig.startTime,
        endTime: launchConfig.endTime,
        projectMinCommitment: launchConfig.projectMinCommitment,
        projectMaxCommitment: launchConfig.projectMaxCommitment,
        totalTokens: launchConfig.totalTokens,
        projectToken: launchConfig.projectToken,
        raisingToken: launchConfig.raisingToken,
        ownerBech32Address: launchConfig.ownerBech32Address,
        daoAdminPubKeyHash: launchConfig.daoAdminPubKeyHash,
        daoFeeReceiverBech32Address: launchConfig.daoFeeReceiverBech32Address,
        collateral: launchConfig.collateral,
        nodeAda: launchConfig.nodeAda,
        oilAda: launchConfig.oilAda,
        commitFoldFeeAda: launchConfig.commitFoldFeeAda,
      }),
    ],
  )

  return {
    rewardsHolderValidator,
    rewardsFoldPolicy,
    nodePolicy,
    commitFoldPolicy,
    tokensHolderPolicy,
    commitFoldValidator,
    tokensHolderFinalValidator,
    tokensHolderFirstValidator,
    rewardsFoldValidator,
    nodeValidator,
  }
}
