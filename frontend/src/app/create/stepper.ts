import {defineStepper} from '@/components/stepper'
import {LaunchDraftStage, launchDraftStageToString} from './types'

export const {Stepper, useStepper} = defineStepper(
  {
    id: launchDraftStageToString[LaunchDraftStage.PROJECT_INFORMATION],
    title: 'Project Information',
  },
  {
    id: launchDraftStageToString[LaunchDraftStage.TOKEN_INFORMATION],
    title: 'Token Information',
  },
  {
    id: launchDraftStageToString[LaunchDraftStage.SPECIFICATION],
    title: 'Specification',
  },
  {
    id: launchDraftStageToString[LaunchDraftStage.USER_ACCESS],
    title: 'User Access',
  },
  {
    id: launchDraftStageToString[LaunchDraftStage.OVERVIEW],
    title: 'Overview',
  },
)
