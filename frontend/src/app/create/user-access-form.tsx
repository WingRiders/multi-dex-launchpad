import {revalidateLogic} from '@tanstack/react-form'
import type {SetNullable} from '@wingriders/multi-dex-launchpad-common'
import {addDays} from 'date-fns'
import type {OverrideProperties} from 'type-fest'
import {useShallow} from 'zustand/shallow'
import {Button} from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {useAppForm, withFieldGroup} from '@/forms/context'
import {formatDateTime} from '@/helpers/format'
import {getLaunchStartTime, isLaunchDraftStageAfter} from './helpers'
import {type UserAccess, userAccessSchema} from './schemas'
import {Stepper, useStepper} from './stepper'
import {useCreateLaunchStore} from './store'
import {LaunchDraftStage} from './types'

type FormInputData = OverrideProperties<
  UserAccess,
  {
    defaultTier?: SetNullable<
      NonNullable<UserAccess['defaultTier']>,
      'minCommitment'
    >
    presaleTier?: SetNullable<
      NonNullable<UserAccess['presaleTier']>,
      'minCommitment'
    >
  }
>

export const UserAccessForm = () => {
  const {draft, saveStageData} = useCreateLaunchStore(
    useShallow(({draft, saveStageData}) => ({draft, saveStageData})),
  )

  const stepper = useStepper()

  const defaultTierDefaultData: FormInputData['defaultTier'] = {
    minCommitment: null,
    startTime: addDays(new Date(), 1),
    maxCommitment: null,
  }

  const defaultFormValues: FormInputData =
    draft && isLaunchDraftStageAfter(draft, LaunchDraftStage.USER_ACCESS)
      ? draft.userAccess
      : {
          defaultTier: defaultTierDefaultData,
          presaleTier: undefined,
          endTime: addDays(new Date(), 3),
        }

  const form = useAppForm({
    defaultValues: defaultFormValues,
    onSubmit: ({value}) => {
      const data = userAccessSchema.parse(value)
      saveStageData({
        stage: LaunchDraftStage.USER_ACCESS,
        userAccess: data,
      })
      stepper.next()
    },
    validators: {
      onDynamic: userAccessSchema,
    },
    validationLogic: revalidateLogic(),
  })

  const fullDraft =
    draft && isLaunchDraftStageAfter(draft, LaunchDraftStage.SPECIFICATION)
      ? draft
      : null

  if (!fullDraft)
    // this shouldn't happen
    return null

  return (
    <div>
      <form
        id="user-access-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <TierForm
            form={form}
            fields={{tierData: 'defaultTier'}}
            tierName="Public tier"
            description="The public tier is the default tier for the token launch. It is available to all users."
            raisingTokenUnit={fullDraft.specification.raisingTokenUnit}
          />

          <TierForm
            form={form}
            fields={{tierData: 'presaleTier'}}
            tierName="Presale tier"
            description="The presale tier is a tier that is available to users who hold the specified NFT."
            raisingTokenUnit={fullDraft.specification.raisingTokenUnit}
            additionalInputs={
              <form.AppField name="presaleTier.nftPolicyId">
                {(field) => (
                  <div className="col-span-3">
                    <field.TextField label="NFT policy ID" />
                  </div>
                )}
              </form.AppField>
            }
          />

          <form.Subscribe selector={(state) => state.errorMap.onDynamic?.['']}>
            {(formErrors) => <FieldError errors={formErrors} />}
          </form.Subscribe>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form.Subscribe
              selector={(state) => getLaunchStartTime(state.values)}
            >
              {(launchStartTime) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>Launch start time</FieldLabel>
                    <FieldDescription>
                      The start time of the launch. It's the earliest start time
                      of all tiers.
                    </FieldDescription>
                  </FieldContent>
                  {launchStartTime != null ? (
                    <p>{formatDateTime(launchStartTime)}</p>
                  ) : (
                    <p>Not set</p>
                  )}
                </Field>
              )}
            </form.Subscribe>

            <form.AppField name="endTime">
              {(field) => (
                <field.DateTimeField
                  label="Launch end time"
                  description="The end time of the token launch. Applies to all configured tiers."
                />
              )}
            </form.AppField>
          </div>
        </FieldGroup>
      </form>

      <Stepper.Controls className="mt-8">
        <Button
          variant="secondary"
          onClick={stepper.prev}
          disabled={stepper.isFirst}
        >
          Previous
        </Button>
        <Button type="submit" form="user-access-form">
          Next
        </Button>
      </Stepper.Controls>
    </div>
  )
}

const tierFormDefaultValues: {
  tierData:
    | {
        startTime: Date
        minCommitment: bigint | null
        maxCommitment: bigint | null
      }
    | undefined
} = {
  tierData: {
    startTime: addDays(new Date(), 1),
    minCommitment: null,
    maxCommitment: null,
  },
}

const tierFormDefaultProps: {
  tierName: string
  raisingTokenUnit: string
  description: string
  additionalInputs?: React.ReactNode
} = {
  tierName: '',
  description: '',
  raisingTokenUnit: '',
}

const TierForm = withFieldGroup({
  defaultValues: tierFormDefaultValues,
  props: tierFormDefaultProps,
  render: function Render({
    group,
    tierName,
    description,
    raisingTokenUnit,
    additionalInputs,
  }) {
    return (
      <group.Subscribe selector={(state) => state.values.tierData != null}>
        {(hasTier) => (
          <div className="space-y-4 rounded-xl border border-border/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-xl"> {tierName}</h2>
              {hasTier ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    group.setFieldValue('tierData', undefined)
                    group.form.validate('change')
                  }}
                >
                  Remove
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    group.setFieldValue(
                      'tierData',
                      tierFormDefaultValues.tierData,
                    )
                    group.form.validate('change')
                  }}
                >
                  Add
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{description}</p>
            {hasTier && (
              <div className="grid grid-cols-3 gap-4">
                <group.AppField name="tierData.startTime">
                  {(field) => <field.DateTimeField label="Start time" />}
                </group.AppField>
                <group.AppField name="tierData.minCommitment">
                  {(field) => (
                    <field.UnitQuantityField
                      label="Minimum contribution from one user"
                      unit={raisingTokenUnit}
                    />
                  )}
                </group.AppField>
                <group.AppField name="tierData.maxCommitment">
                  {(field) => (
                    <field.UnitQuantityField
                      label="Maximum contribution from one user"
                      unit={raisingTokenUnit}
                      isOptional
                    />
                  )}
                </group.AppField>
                {additionalInputs}
              </div>
            )}
          </div>
        )}
      </group.Subscribe>
    )
  },
})
