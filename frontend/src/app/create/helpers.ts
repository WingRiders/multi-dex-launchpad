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
