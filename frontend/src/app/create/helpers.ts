import type {Unit, UTxO} from '@meshsdk/core'
import {min as minDate} from 'date-fns'
import {compact} from 'es-toolkit'
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
