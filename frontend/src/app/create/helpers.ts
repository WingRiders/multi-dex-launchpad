import type {TxInput, Unit, UTxO} from '@meshsdk/core'
import {
  COMMIT_FOLD_FEE_ADA,
  DAO_ADMIN_PUB_KEY_HASH,
  DAO_FEE_DENOMINATOR,
  DAO_FEE_NUMERATOR,
  DAO_FEE_RECEIVER_BECH32_ADDRESS,
  DISABLED_TIER_CS,
  LAUNCH_COLLATERAL,
  type LaunchConfig,
  MAX_INT64,
  type Network,
  NODE_ADA,
  OIL_ADA,
  type ProjectInfoTxMetadata,
  SUNDAE_POOL_SCRIPT_HASH,
  SUNDAE_SETTINGS_SYMBOL,
  VESTING_PERIOD_DURATION,
  VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
  VESTING_PERIOD_INSTALLMENTS,
  VESTING_VALIDATOR_HASH,
  WR_FACTORY_VALIDATOR_HASH,
  WR_POOL_SYMBOL,
  WR_POOL_VALIDATOR_HASH,
} from '@wingriders/multi-dex-launchpad-common'
import {min as minDate} from 'date-fns'
import {compact} from 'es-toolkit'
import {SUNDAE_FEE_TOLERANCE} from '../constants'
import type {
  AllDraftStagesAfter,
  CompleteDataForDraftStage,
  LaunchDraftStage,
  PrevLaunchDraftStage,
} from './types'

/**
 * @returns true if the stage of the draft `obj` is after `stageToCompare`
 */
export const isLaunchDraftStageAfter = <
  TDraftObj extends {stage: LaunchDraftStage},
  TStage extends Exclude<LaunchDraftStage, LaunchDraftStage.OVERVIEW>,
>(
  obj: TDraftObj,
  stageToCompare: TStage,
): obj is TDraftObj &
  CompleteDataForDraftStage<TStage> & {
    stage: AllDraftStagesAfter<TStage>
  } => obj.stage > stageToCompare

/**
 * @returns true if the stage of the draft `obj` is at least `stageToCompare`
 */
export const isLaunchDraftStageAtLeast = <
  TDraftObj extends {stage: LaunchDraftStage},
  TStage extends LaunchDraftStage,
>(
  obj: TDraftObj,
  stageToCompare: TStage,
): obj is TDraftObj &
  CompleteDataForDraftStage<PrevLaunchDraftStage<TStage>> & {
    stage: TStage | AllDraftStagesAfter<TStage>
  } => obj.stage >= stageToCompare

export const getLaunchStartTime = (userAccess: {
  defaultTier?: {startTime: Date}
  presaleTier?: {startTime: Date}
}) => {
  const tiersStartTimes = compact([
    userAccess.defaultTier?.startTime,
    userAccess.presaleTier?.startTime,
  ])
  return tiersStartTimes.length > 0 ? minDate(tiersStartTimes) : null
}

export const getLaunchStartTimeForce = (userAccess: {
  defaultTier?: {startTime: Date}
  presaleTier?: {startTime: Date}
}) => {
  const startTime = getLaunchStartTime(userAccess)
  if (startTime == null) throw new Error('No start times found')
  return startTime
}

export const findStarterUtxo = (utxos: UTxO[], projectTokenUnit: Unit) => {
  return utxos.reduce<UTxO | undefined>((acc, current) => {
    const projectTokenQuantity = current.output.amount.find(
      ({unit}) => unit === projectTokenUnit,
    )?.quantity
    if (projectTokenQuantity == null) return acc
    if (acc == null) return current

    return projectTokenQuantity >
      acc.output.amount.find(({unit}) => unit === projectTokenUnit)!.quantity
      ? current
      : acc
  }, undefined)
}

export const buildConfigAndProjectInfo = (
  draft: CompleteDataForDraftStage<LaunchDraftStage.OVERVIEW>,
  network: Network,
  starterUtxo: TxInput,
  ownerBech32Address: string,
) => {
  const {projectInformation, tokenInformation, specification, userAccess} =
    draft

  const launchStartTime = getLaunchStartTimeForce(userAccess)

  const config: LaunchConfig = {
    ownerBech32Address,
    splitBps: specification.splitBps,
    wrPoolValidatorHash: WR_POOL_VALIDATOR_HASH[network],
    wrFactoryValidatorHash: WR_FACTORY_VALIDATOR_HASH[network],
    wrPoolCurrencySymbol: WR_POOL_SYMBOL[network],
    sundaePoolScriptHash: SUNDAE_POOL_SCRIPT_HASH[network],
    sundaeFeeTolerance: SUNDAE_FEE_TOLERANCE,
    sundaeSettingsCurrencySymbol: SUNDAE_SETTINGS_SYMBOL[network],
    startTime: launchStartTime.getTime(),
    endTime: userAccess.endTime.getTime(),
    projectToken: tokenInformation.projectTokenToSale.unit,
    raisingToken: specification.raisingTokenUnit,
    projectMinCommitment: specification.projectMinCommitment,
    projectMaxCommitment: specification.projectMaxCommitment ?? MAX_INT64,
    totalTokens:
      tokenInformation.projectTokenToSale.quantity +
      specification.projectTokensToPool,
    tokensToDistribute: tokenInformation.projectTokenToSale.quantity,
    raisedTokensPoolPartPercentage:
      specification.raisedTokensPoolPartPercentage,
    daoFeeNumerator: DAO_FEE_NUMERATOR,
    daoFeeDenominator: DAO_FEE_DENOMINATOR,
    daoFeeReceiverBech32Address: DAO_FEE_RECEIVER_BECH32_ADDRESS[network],
    daoAdminPubKeyHash: DAO_ADMIN_PUB_KEY_HASH[network],
    collateral: LAUNCH_COLLATERAL,
    starter: starterUtxo,
    vestingPeriodDuration: VESTING_PERIOD_DURATION,
    vestingPeriodDurationToFirstUnlock: VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
    vestingPeriodInstallments: VESTING_PERIOD_INSTALLMENTS,
    vestingPeriodStart: userAccess.endTime.getTime(),
    vestingValidatorHash: VESTING_VALIDATOR_HASH,
    presaleTierCs: userAccess.presaleTier?.nftPolicyId ?? DISABLED_TIER_CS,
    presaleTierStartTime:
      userAccess.presaleTier?.startTime.getTime() ??
      userAccess.endTime.getTime() + 1,
    defaultStartTime:
      userAccess.defaultTier?.startTime.getTime() ??
      userAccess.endTime.getTime() + 1,
    presaleTierMinCommitment: userAccess.presaleTier?.minCommitment ?? 0n,
    defaultTierMinCommitment: userAccess.defaultTier?.minCommitment ?? 0n,
    presaleTierMaxCommitment:
      userAccess.presaleTier?.maxCommitment ?? MAX_INT64,
    defaultTierMaxCommitment:
      userAccess.defaultTier?.maxCommitment ?? MAX_INT64,
    nodeAda: NODE_ADA,
    commitFoldFeeAda: COMMIT_FOLD_FEE_ADA,
    oilAda: OIL_ADA,
  }

  const projectInfo: ProjectInfoTxMetadata = {
    title: projectInformation.title,
    description: projectInformation.description,
    url: projectInformation.url,
    logoUrl: projectInformation.logoUrl,
    tokenomicsUrl: projectInformation.tokenomicsUrl,
    whitepaperUrl: projectInformation.whitepaperUrl,
    termsAndConditionsUrl: projectInformation.termsAndConditionsUrl,
    additionalUrl: projectInformation.additionalUrl,
  }

  return {config, projectInfo}
}
