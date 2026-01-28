import {create} from 'zustand'
import {persist} from 'zustand/middleware'
import {isLaunchDraftStageAtLeast} from './helpers'
import {
  type DraftStageDiscriminatedData,
  type LaunchDraft,
  LaunchDraftStage,
} from './types'

export type CreateLaunchState = {
  draft?: LaunchDraft
  createDraft: () => void
  saveStageData: (draft: DraftStageDiscriminatedData) => void
  deleteDraft: () => void
  isHydrated: boolean
}

export const useCreateLaunchStore = create<CreateLaunchState>()(
  persist(
    (set, get) => ({
      draft: undefined,
      isHydrated: false,
      createDraft: () => {
        set({
          draft: {
            stage: LaunchDraftStage.PROJECT_INFORMATION,
          },
        })
      },
      saveStageData: (payload) => {
        const draft = get().draft

        if (!draft) {
          throw new Error(
            'Cannot save stage data without creating a draft first',
          )
        }

        if (!isLaunchDraftStageAtLeast(draft, payload.stage)) {
          throw new Error(
            `Cannot complete stage ${payload.stage} without completing all previous stages`,
          )
        }

        set({
          draft: {
            ...draft,
            ...payload,
            stage: Math.max(draft.stage, payload.stage + 1),
          },
        })
      },
      deleteDraft: () => {
        set({draft: undefined})
      },
    }),
    {
      name: 'create-launch',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) state.isHydrated = true
        }
      },
    },
  ),
)
