import {resolvePaymentKeyHash} from '@meshsdk/core'
import {type ConstantContracts, type Contract, SPLIT_BPS_BASE} from '..'
import {applyParamsToScriptExport} from '../helpers/script'
import {commitFoldConfigToMeshData} from '../launchpad-configs/commit-fold-config'
import {commitFoldPolicyConfigToMeshData} from '../launchpad-configs/commit-fold-policy-config'
import type {LaunchpadConfig} from '../launchpad-configs/launchpad-config'
import {nodeConfigToMeshData} from '../launchpad-configs/node-config'
import {nodePolicyConfigToMeshData} from '../launchpad-configs/node-policy-config'
import {rewardsFoldConfigToMeshData} from '../launchpad-configs/rewards-fold-config'
import {rewardsFoldPolicyConfigToMeshData} from '../launchpad-configs/rewards-fold-policy-config'
import {rewardsHolderConfigToMeshData} from '../launchpad-configs/rewards-holder-config'
import {tokensHolderFinalConfigToMeshData} from '../launchpad-configs/tokens-holder-final-config'
import {tokensHolderFirstConfigToMeshData} from '../launchpad-configs/tokens-holder-first-config'
import {tokensHolderPolicyConfigToMeshData} from '../launchpad-configs/tokens-holder-policy-config'
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

export const generateLaunchpadContracts = async (
  launchpadConfig: LaunchpadConfig,
  constantScriptHashes: ConstantContracts,
): Promise<GeneratedContracts> => {
  const rewardsHolderValidator = await applyParamsToScriptExport(
    artifacts.parametricRewardsHolderValidator,
    [
      rewardsHolderConfigToMeshData({
        poolProofValidatorHash: constantScriptHashes.poolProofValidator.hash,
        poolProofSymbol: constantScriptHashes.poolProofPolicy.hash,
        usesWr: launchpadConfig.splitBps > 0n,
        usesSundae: launchpadConfig.splitBps < SPLIT_BPS_BASE,
        endTime: launchpadConfig.endTime,
      }),
    ],
  )

  const rewardsFoldPolicy = await applyParamsToScriptExport(
    artifacts.parametricRewardsFoldPolicy,
    [rewardsFoldPolicyConfigToMeshData({starter: launchpadConfig.starter})],
  )

  const nodePolicy = await applyParamsToScriptExport(
    artifacts.parametricNodePolicy,
    [
      nodePolicyConfigToMeshData({
        starter: launchpadConfig.starter,
        ownerPubKeyHash: resolvePaymentKeyHash(
          launchpadConfig.ownerBech32Address,
        ),
        nodeAda: launchpadConfig.nodeAda,
      }),
    ],
  )

  const commitFoldPolicy = await applyParamsToScriptExport(
    artifacts.parametricCommitFoldPolicy,
    [
      commitFoldPolicyConfigToMeshData({
        starter: launchpadConfig.starter,
        endTime: launchpadConfig.endTime,
        nodeSymbol: nodePolicy.hash,
      }),
    ],
  )

  const tokensHolderPolicy = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderPolicy,
    [
      tokensHolderPolicyConfigToMeshData({
        owner: resolvePaymentKeyHash(launchpadConfig.ownerBech32Address),
        startTime: launchpadConfig.startTime,
        totalTokens: launchpadConfig.totalTokens,
        projectToken: launchpadConfig.projectToken,
        collateral: launchpadConfig.collateral,
        starter: launchpadConfig.starter,
        nodeSymbol: nodePolicy.hash,
      }),
    ],
  )

  const commitFoldValidator = await applyParamsToScriptExport(
    artifacts.parametricCommitFoldValidator,
    [
      commitFoldConfigToMeshData({
        starter: launchpadConfig.starter,
        commitFoldSymbol: commitFoldPolicy.hash,
        nodeSymbol: nodePolicy.hash,
        endTime: launchpadConfig.endTime,
        daoAdminPubKeyHash: launchpadConfig.daoAdminPubKeyHash,
      }),
    ],
  )

  const tokensHolderFinalValidator = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderFinalValidator,
    [
      tokensHolderFinalConfigToMeshData({
        ownerBech32Address: launchpadConfig.ownerBech32Address,
        wrPoolSymbol: launchpadConfig.wrPoolCurrencySymbol,
        wrPoolValidatorHash: launchpadConfig.wrPoolValidatorHash,
        wrFactoryValidatorHash: launchpadConfig.wrFactoryValidatorHash,
        sundaePoolScriptHash: launchpadConfig.sundaePoolScriptHash,
        sundaeFeeTolerance: launchpadConfig.sundaeFeeTolerance,
        sundaeSettingsCurrencySymbol:
          launchpadConfig.sundaeSettingsCurrencySymbol,
        poolProofValidatorHash: constantScriptHashes.failProofValidator.hash,
        vestingValidatorHash: launchpadConfig.vestingValidatorHash,
        vestingPeriodDuration: launchpadConfig.vestingPeriodDuration,
        vestingPeriodDurationToFirstUnlock:
          launchpadConfig.vestingPeriodDurationToFirstUnlock,
        vestingPeriodInstallments: launchpadConfig.vestingPeriodInstallments,
        vestingPeriodStart: launchpadConfig.vestingPeriodStart,
        daoFeeReceiverBech32Address:
          launchpadConfig.daoFeeReceiverBech32Address,
        raisingToken: launchpadConfig.raisingToken,
        projectToken: launchpadConfig.projectToken,
        starter: launchpadConfig.starter,
      }),
    ],
  )

  const tokensHolderFirstValidator = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderFirstValidator,
    [
      tokensHolderFirstConfigToMeshData({
        ownerBech32Address: launchpadConfig.ownerBech32Address,
        startTime: launchpadConfig.startTime,
        projectTokensHolderSymbol: tokensHolderPolicy.hash,
        starter: launchpadConfig.starter,
        endTime: launchpadConfig.endTime,
        daoAdminPubKeyHash: launchpadConfig.daoAdminPubKeyHash,
      }),
    ],
  )

  const rewardsFoldValidator = await applyParamsToScriptExport(
    artifacts.parametricRewardsFoldValidator,
    [
      rewardsFoldConfigToMeshData({
        starter: launchpadConfig.starter,
        ownerBech32Address: launchpadConfig.ownerBech32Address,
        nodeSymbol: nodePolicy.hash,
        rewardsFoldPolicy: rewardsFoldPolicy.hash,
        rewardsHolderValidatorHash: rewardsHolderValidator.hash,
        finalProjectTokensHolderValidatorHash: tokensHolderFinalValidator.hash,
        firstProjectTokensHolderValidatorHash: tokensHolderFirstValidator.hash,
        projectTokensHolderPolicy: tokensHolderPolicy.hash,
        projectToken: launchpadConfig.projectToken,
        raisingToken: launchpadConfig.raisingToken,
        presaleTierCs: launchpadConfig.presaleTierCs,
        tokensToDistribute: launchpadConfig.totalTokens,
        endTime: launchpadConfig.endTime,
        oilAda: launchpadConfig.oilAda,
        commitFoldFeeAda: launchpadConfig.commitFoldFeeAda,
        splitBps: launchpadConfig.splitBps,
        daoFeeNumerator: launchpadConfig.daoFeeNumerator,
        daoFeeDenominator: launchpadConfig.daoFeeDenominator,
        daoFeeReceiverBech32Address:
          launchpadConfig.daoFeeReceiverBech32Address,
        raisedTokensPoolPartPercentage:
          launchpadConfig.raisedTokensPoolPartPercentage,
        collateral: launchpadConfig.collateral,
      }),
    ],
  )

  const nodeValidator = await applyParamsToScriptExport(
    artifacts.parametricNodeValidator,
    [
      nodeConfigToMeshData({
        starter: launchpadConfig.starter,
        nodeSymbol: nodePolicy.hash,
        rewardsFoldSymbol: rewardsFoldPolicy.hash,
        rewardsFoldValidatorHash: rewardsFoldValidator.hash,
        commitFoldSymbol: commitFoldPolicy.hash,
        commitFoldValidatorHash: commitFoldValidator.hash,
        tokensHolderSymbol: tokensHolderPolicy.hash,
        tokensHolderValidatorHash: tokensHolderFinalValidator.hash,
        failProofSymbol: constantScriptHashes.failProofPolicy.hash,
        failProofValidatorHash: constantScriptHashes.failProofValidator.hash,
        presaleTierCs: launchpadConfig.presaleTierCs,
        presaleTierMinCommitment: launchpadConfig.presaleTierMinCommitment,
        presaleTierMaxCommitment: launchpadConfig.presaleTierMaxCommitment,
        presaleTierStartTime: launchpadConfig.presaleTierStartTime,
        defaultTierMinCommitment: launchpadConfig.defaultTierMinCommitment,
        defaultTierMaxCommitment: launchpadConfig.defaultTierMaxCommitment,
        defaultStartTime: launchpadConfig.defaultStartTime,
        startTime: launchpadConfig.startTime,
        endTime: launchpadConfig.endTime,
        projectMinCommitment: launchpadConfig.projectMinCommitment,
        projectMaxCommitment: launchpadConfig.projectMaxCommitment,
        totalTokens: launchpadConfig.totalTokens,
        projectToken: launchpadConfig.projectToken,
        raisingToken: launchpadConfig.raisingToken,
        ownerBech32Address: launchpadConfig.ownerBech32Address,
        daoAdminPubKeyHash: launchpadConfig.daoAdminPubKeyHash,
        daoFeeReceiverBech32Address:
          launchpadConfig.daoFeeReceiverBech32Address,
        collateral: launchpadConfig.collateral,
        nodeAda: launchpadConfig.nodeAda,
        oilAda: launchpadConfig.oilAda,
        commitFoldFeeAda: launchpadConfig.commitFoldFeeAda,
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
