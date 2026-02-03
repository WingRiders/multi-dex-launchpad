import {revalidateLogic} from '@tanstack/react-form'
import {MAX_LENGTHS} from '@wingriders/multi-dex-launchpad-common'
import {useShallow} from 'zustand/shallow'
import {Button} from '@/components/ui/button'
import {FieldGroup} from '@/components/ui/field'
import {useAppForm} from '@/forms/context'
import {isLaunchDraftStageAfter} from './helpers'
import {type ProjectInformation, projectInformationSchema} from './schemas'
import {Stepper, useStepper} from './stepper'
import {useCreateLaunchStore} from './store'
import {LaunchDraftStage} from './types'

export const ProjectInformationForm = () => {
  const {draft, saveStageData, createDraft} = useCreateLaunchStore(
    useShallow(({draft, saveStageData, createDraft}) => ({
      draft,
      saveStageData,
      createDraft,
    })),
  )

  const stepper = useStepper()

  const defaultFormValues: ProjectInformation =
    draft &&
    isLaunchDraftStageAfter(draft, LaunchDraftStage.PROJECT_INFORMATION)
      ? draft.projectInformation
      : {
          title: '',
          description: '',
          url: '',
          tokenomicsUrl: '',
          whitepaperUrl: undefined,
          termsAndConditionsUrl: undefined,
          additionalUrl: undefined,
          logoUrl: '',
        }

  const form = useAppForm({
    defaultValues: defaultFormValues,
    onSubmit: ({value}) => {
      if (!draft) {
        createDraft()
      }
      saveStageData({
        stage: LaunchDraftStage.PROJECT_INFORMATION,
        projectInformation: value,
      })
      stepper.next()
    },
    validators: {
      onDynamic: projectInformationSchema,
    },
    validationLogic: revalidateLogic(),
  })

  return (
    <div>
      <form
        id="project-information-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label="Launch title"
                placeholder="Enter title"
                showCharactersCountForMax={MAX_LENGTHS.title}
                charactersCountAlign="inline-end"
              />
            )}
          </form.AppField>

          <form.AppField name="description">
            {(field) => (
              <field.TextField
                label="Description"
                placeholder="Enter description"
                showCharactersCountForMax={MAX_LENGTHS.description}
                useTextArea
              />
            )}
          </form.AppField>

          <form.AppField name="url">
            {(field) => (
              <field.TextField
                label="Link to detailed information about project and its product"
                placeholder="https://yourwebsite.com"
              />
            )}
          </form.AppField>

          <form.AppField name="tokenomicsUrl">
            {(field) => (
              <field.TextField
                label="Tokenomics link"
                placeholder="https://yourwebsite.com/tokenomics"
              />
            )}
          </form.AppField>

          <form.AppField name="whitepaperUrl">
            {(field) => (
              <field.TextField
                label="Whitepaper link"
                placeholder="https://yourwebsite.com/whitepaper"
                isOptional
              />
            )}
          </form.AppField>

          <form.AppField name="termsAndConditionsUrl">
            {(field) => (
              <field.TextField
                label="Terms and Conditions link"
                placeholder="https://yourwebsite.com/terms-and-conditions"
                isOptional
              />
            )}
          </form.AppField>

          <form.AppField name="additionalUrl">
            {(field) => (
              <field.TextField
                label="Link to other important information or credentials"
                placeholder="https://yourwebsite.com/team"
                isOptional
              />
            )}
          </form.AppField>

          <form.AppField name="logoUrl">
            {(field) => (
              <field.TextField
                label="Main marketing image for the launch (on IPFS)"
                placeholder="ipfs://..."
              />
            )}
          </form.AppField>
        </FieldGroup>
      </form>

      <Stepper.Controls className="mt-8">
        <Button type="submit" form="project-information-form">
          Next
        </Button>
      </Stepper.Controls>
    </div>
  )
}
