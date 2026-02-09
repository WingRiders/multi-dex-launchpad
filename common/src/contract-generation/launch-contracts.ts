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
  launchCOnfig: LaunchConfig,
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
    [rewardsFoldPolicyConfigToMeshData({starter: launchCOnfig.starter})],
  )

  const nodePolicy = await applyParamsToScriptExport(
    artifacts.parametricNodePolicy,
    [
      nodePolicyConfigToMeshData({
        starter: launchCOnfig.starter,
        ownerPubKeyHash: resolvePaymentKeyHash(launchCOnfig.ownerBech32Address),
        nodeAda: launchCOnfig.nodeAda,
      }),
    ],
  )

  const commitFoldPolicy = await applyParamsToScriptExport(
    artifacts.parametricCommitFoldPolicy,
    [
      commitFoldPolicyConfigToMeshData({
        starter: launchCOnfig.starter,
        endTime: launchCOnfig.endTime,
        nodeSymbol: nodePolicy.hash,
      }),
    ],
  )

  const tokensHolderPolicy = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderPolicy,
    [
      tokensHolderPolicyConfigToMeshData({
        owner: resolvePaymentKeyHash(launchCOnfig.ownerBech32Address),
        startTime: launchCOnfig.startTime,
        totalTokens: launchCOnfig.totalTokens,
        projectToken: launchCOnfig.projectToken,
        collateral: launchCOnfig.collateral,
        starter: launchCOnfig.starter,
        nodeSymbol: nodePolicy.hash,
      }),
    ],
  )

  const commitFoldValidator = await applyParamsToScriptExport(
    artifacts.parametricCommitFoldValidator,
    [
      commitFoldConfigToMeshData({
        starter: launchCOnfig.starter,
        commitFoldSymbol: commitFoldPolicy.hash,
        nodeSymbol: nodePolicy.hash,
        endTime: launchCOnfig.endTime,
        daoAdminPubKeyHash: launchCOnfig.daoAdminPubKeyHash,
      }),
    ],
  )

  const tokensHolderFinalValidator = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderFinalValidator,
    [
      tokensHolderFinalConfigToMeshData({
        ownerBech32Address: launchCOnfig.ownerBech32Address,
        wrPoolSymbol: launchCOnfig.wrPoolCurrencySymbol,
        wrPoolValidatorHash: launchCOnfig.wrPoolValidatorHash,
        wrFactoryValidatorHash: launchCOnfig.wrFactoryValidatorHash,
        sundaePoolScriptHash: launchCOnfig.sundaePoolScriptHash,
        sundaeFeeTolerance: launchCOnfig.sundaeFeeTolerance,
        sundaeSettingsCurrencySymbol: launchCOnfig.sundaeSettingsCurrencySymbol,
        poolProofValidatorHash: constantScriptHashes.failProofValidator.hash,
        vestingValidatorHash: launchCOnfig.vestingValidatorHash,
        vestingPeriodDuration: launchCOnfig.vestingPeriodDuration,
        vestingPeriodDurationToFirstUnlock:
          launchCOnfig.vestingPeriodDurationToFirstUnlock,
        vestingPeriodInstallments: launchCOnfig.vestingPeriodInstallments,
        vestingPeriodStart: launchCOnfig.vestingPeriodStart,
        daoFeeReceiverBech32Address: launchCOnfig.daoFeeReceiverBech32Address,
        raisingToken: launchCOnfig.raisingToken,
        projectToken: launchCOnfig.projectToken,
        starter: launchCOnfig.starter,
      }),
    ],
  )

  const tokensHolderFirstValidator = await applyParamsToScriptExport(
    artifacts.parametricProjectTokensHolderFirstValidator,
    [
      tokensHolderFirstConfigToMeshData({
        ownerBech32Address: launchCOnfig.ownerBech32Address,
        startTime: launchCOnfig.startTime,
        projectTokensHolderSymbol: tokensHolderPolicy.hash,
        starter: launchCOnfig.starter,
        endTime: launchCOnfig.endTime,
        daoAdminPubKeyHash: launchCOnfig.daoAdminPubKeyHash,
      }),
    ],
  )

  const rewardsFoldValidator = await applyParamsToScriptExport(
    artifacts.parametricRewardsFoldValidator,
    [
      rewardsFoldConfigToMeshData({
        starter: launchCOnfig.starter,
        ownerBech32Address: launchCOnfig.ownerBech32Address,
        nodeSymbol: nodePolicy.hash,
        rewardsFoldPolicy: rewardsFoldPolicy.hash,
        rewardsHolderValidatorHash: rewardsHolderValidator.hash,
        finalProjectTokensHolderValidatorHash: tokensHolderFinalValidator.hash,
        firstProjectTokensHolderValidatorHash: tokensHolderFirstValidator.hash,
        projectTokensHolderPolicy: tokensHolderPolicy.hash,
        projectToken: launchCOnfig.projectToken,
        raisingToken: launchCOnfig.raisingToken,
        presaleTierCs: launchCOnfig.presaleTierCs,
        tokensToDistribute: launchCOnfig.totalTokens,
        endTime: launchCOnfig.endTime,
        oilAda: launchCOnfig.oilAda,
        commitFoldFeeAda: launchCOnfig.commitFoldFeeAda,
        splitBps: launchCOnfig.splitBps,
        daoFeeNumerator: launchCOnfig.daoFeeNumerator,
        daoFeeDenominator: launchCOnfig.daoFeeDenominator,
        daoFeeReceiverBech32Address: launchCOnfig.daoFeeReceiverBech32Address,
        raisedTokensPoolPartPercentage:
          launchCOnfig.raisedTokensPoolPartPercentage,
        collateral: launchCOnfig.collateral,
      }),
    ],
  )

  const nodeValidator = await applyParamsToScriptExport(
    artifacts.parametricNodeValidator,
    [
      nodeConfigToMeshData({
        starter: launchCOnfig.starter,
        nodeSymbol: nodePolicy.hash,
        rewardsFoldSymbol: rewardsFoldPolicy.hash,
        rewardsFoldValidatorHash: rewardsFoldValidator.hash,
        commitFoldSymbol: commitFoldPolicy.hash,
        commitFoldValidatorHash: commitFoldValidator.hash,
        tokensHolderSymbol: tokensHolderPolicy.hash,
        tokensHolderFirstValidatorHash: tokensHolderFirstValidator.hash,
        failProofSymbol: constantScriptHashes.failProofPolicy.hash,
        failProofValidatorHash: constantScriptHashes.failProofValidator.hash,
        presaleTierCs: launchCOnfig.presaleTierCs,
        presaleTierMinCommitment: launchCOnfig.presaleTierMinCommitment,
        presaleTierMaxCommitment: launchCOnfig.presaleTierMaxCommitment,
        presaleTierStartTime: launchCOnfig.presaleTierStartTime,
        defaultTierMinCommitment: launchCOnfig.defaultTierMinCommitment,
        defaultTierMaxCommitment: launchCOnfig.defaultTierMaxCommitment,
        defaultStartTime: launchCOnfig.defaultStartTime,
        startTime: launchCOnfig.startTime,
        endTime: launchCOnfig.endTime,
        projectMinCommitment: launchCOnfig.projectMinCommitment,
        projectMaxCommitment: launchCOnfig.projectMaxCommitment,
        totalTokens: launchCOnfig.totalTokens,
        projectToken: launchCOnfig.projectToken,
        raisingToken: launchCOnfig.raisingToken,
        ownerBech32Address: launchCOnfig.ownerBech32Address,
        daoAdminPubKeyHash: launchCOnfig.daoAdminPubKeyHash,
        daoFeeReceiverBech32Address: launchCOnfig.daoFeeReceiverBech32Address,
        collateral: launchCOnfig.collateral,
        nodeAda: launchCOnfig.nodeAda,
        oilAda: launchCOnfig.oilAda,
        commitFoldFeeAda: launchCOnfig.commitFoldFeeAda,
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
