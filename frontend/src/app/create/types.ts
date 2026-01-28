import type {Unit} from '@meshsdk/core'
import type {IsNever, Simplify, TaggedUnion} from 'type-fest'
import type {ProjectInformation} from './schemas'

export type TokenInformation = {
  projectTokenUnit: Unit
  quantityForSale: bigint
}

export type Specification = {
  raisingTokenUnit: Unit
  projectMinCommitment: bigint
  projectMaxCommitment: bigint
  raisedTokensPoolPartPercentage: number
  projectTokensToPool: bigint
  splitBps: number
}

type BaseTierData = {
  startTime: Date
  minCommitment: bigint
  maxCommitment: bigint
}

export type UserAccess = {
  defaultTier?: BaseTierData
  presaleTier?: BaseTierData & {
    nftPolicyId: string
  }
  endTime: Date
}

export enum LaunchDraftStage {
  PROJECT_INFORMATION = 0,
  TOKEN_INFORMATION = 1,
  SPECIFICATION = 2,
  USER_ACCESS = 3,
  OVERVIEW = 4,
}

export const launchDraftStageToString = {
  [LaunchDraftStage.PROJECT_INFORMATION]: 'project-information',
  [LaunchDraftStage.TOKEN_INFORMATION]: 'token-information',
  [LaunchDraftStage.SPECIFICATION]: 'specification',
  [LaunchDraftStage.USER_ACCESS]: 'user-access',
  [LaunchDraftStage.OVERVIEW]: 'overview',
} as const satisfies Record<LaunchDraftStage, string>

export const launchDraftStageStringToEnum: Record<
  (typeof launchDraftStageToString)[keyof typeof launchDraftStageToString],
  LaunchDraftStage
> = {
  'project-information': LaunchDraftStage.PROJECT_INFORMATION,
  'token-information': LaunchDraftStage.TOKEN_INFORMATION,
  specification: LaunchDraftStage.SPECIFICATION,
  'user-access': LaunchDraftStage.USER_ACCESS,
  overview: LaunchDraftStage.OVERVIEW,
}

export type PrevLaunchDraftStage<T extends LaunchDraftStage> =
  T extends LaunchDraftStage.OVERVIEW
    ? LaunchDraftStage.USER_ACCESS
    : T extends LaunchDraftStage.USER_ACCESS
      ? LaunchDraftStage.SPECIFICATION
      : T extends LaunchDraftStage.SPECIFICATION
        ? LaunchDraftStage.TOKEN_INFORMATION
        : T extends LaunchDraftStage.TOKEN_INFORMATION
          ? LaunchDraftStage.PROJECT_INFORMATION
          : never

export type NextLaunchDraftStage<T extends LaunchDraftStage> =
  T extends LaunchDraftStage.PROJECT_INFORMATION
    ? LaunchDraftStage.TOKEN_INFORMATION
    : T extends LaunchDraftStage.TOKEN_INFORMATION
      ? LaunchDraftStage.SPECIFICATION
      : T extends LaunchDraftStage.SPECIFICATION
        ? LaunchDraftStage.USER_ACCESS
        : T extends LaunchDraftStage.USER_ACCESS
          ? LaunchDraftStage.OVERVIEW
          : never

type IsFirstDraftStage<T extends LaunchDraftStage> = IsNever<
  PrevLaunchDraftStage<T>
>
type IsLastDraftStage<T extends LaunchDraftStage> = IsNever<
  NextLaunchDraftStage<T>
>

/**
 * Returns union of all draft stages after T
 */
export type AllDraftStagesAfter<T extends LaunchDraftStage> =
  IsLastDraftStage<T> extends true
    ? never
    : NextLaunchDraftStage<T> | AllDraftStagesAfter<NextLaunchDraftStage<T>>

type DataByDraftStage = {
  [LaunchDraftStage.PROJECT_INFORMATION]: {
    projectInformation: ProjectInformation
  }
  [LaunchDraftStage.TOKEN_INFORMATION]: {
    tokenInformation: TokenInformation
  }
  [LaunchDraftStage.SPECIFICATION]: {
    specification: Specification
  }
  [LaunchDraftStage.USER_ACCESS]: {
    userAccess: UserAccess
  }
  [LaunchDraftStage.OVERVIEW]: Record<never, never>
}

/**
 * Returns type with all fields that should be required in stage T
 */
export type CompleteDataForDraftStage<T extends LaunchDraftStage> =
  IsFirstDraftStage<T> extends true
    ? Record<never, never>
    : DataByDraftStage[PrevLaunchDraftStage<T>] &
        CompleteDataForDraftStage<PrevLaunchDraftStage<T>>

type AllDraftStagesDataAfter<T extends LaunchDraftStage> =
  | ({stage: T} & CompleteDataForDraftStage<T>)
  | (IsLastDraftStage<T> extends true
      ? never
      : AllDraftStagesDataAfter<NextLaunchDraftStage<T>>)

export type LaunchDraft = Simplify<
  AllDraftStagesDataAfter<LaunchDraftStage.PROJECT_INFORMATION>
>

export type DraftStageDiscriminatedData = Simplify<
  TaggedUnion<'stage', DataByDraftStage>
>
