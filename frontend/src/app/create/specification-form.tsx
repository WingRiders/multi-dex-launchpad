import {useQueryClient} from '@tanstack/react-query'
import {
  LOVELACE_UNIT,
  type SetNullable,
  SPLIT_BPS_BASE,
} from '@wingriders/multi-dex-launchpad-common'
import {Loader2Icon} from 'lucide-react'
import {useShallow} from 'zustand/shallow'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {Button} from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {UnitDisplay} from '@/components/unit-display'
import {useAppForm} from '@/forms/context'
import {transformQuantityToNewUnitDecimals} from '@/metadata/helpers'
import {useTRPC} from '@/trpc/client'
import {useWalletBalanceQuery} from '@/wallet/queries'
import {SUPPORTED_RAISING_TOKENS_UNITS} from './constants'
import {isLaunchDraftStageAfter} from './helpers'
import {LiquidityPreview} from './liquidity-preview'
import {PoolAllocatorField} from './pool-allocator-field'
import {
  MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE,
  type Specification,
  specificationSchema,
} from './schemas'
import {Stepper, useStepper} from './stepper'
import {useCreateLaunchStore} from './store'
import {LaunchDraftStage} from './types'

type FormInputData = SetNullable<
  Specification,
  'projectMinCommitment' | 'projectTokensToPool'
>

export const SpecificationForm = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const {draft, saveStageData} = useCreateLaunchStore(
    useShallow(({draft, saveStageData}) => ({draft, saveStageData})),
  )

  const {data: walletBalance, isLoading: isWalletBalanceLoading} =
    useWalletBalanceQuery()

  const stepper = useStepper()

  const defaultFormValues: FormInputData =
    draft && isLaunchDraftStageAfter(draft, LaunchDraftStage.SPECIFICATION)
      ? draft.specification
      : {
          raisingTokenUnit: LOVELACE_UNIT,
          projectMinCommitment: null,
          projectMaxCommitment: null,
          raisedTokensPoolPartPercentage: 50,
          splitBps: SPLIT_BPS_BASE / 2,
          projectTokensToPool: null,
        }

  const form = useAppForm({
    defaultValues: defaultFormValues,
    onSubmit: ({value}) => {
      const data = specificationSchema.parse(value)

      saveStageData({
        stage: LaunchDraftStage.SPECIFICATION,
        specification: data,
      })
      stepper.next()
    },
    validators: {
      onChange: specificationSchema,
    },
  })

  const fullDraft =
    draft && isLaunchDraftStageAfter(draft, LaunchDraftStage.TOKEN_INFORMATION)
      ? draft
      : null

  // this shouldn't happen
  if (!fullDraft) return null

  if (!walletBalance) {
    return isWalletBalanceLoading ? (
      <div className="flex h-60 items-center justify-center">
        <Loader2Icon className="size-8 animate-spin" />
      </div>
    ) : (
      <ErrorAlert
        title="Error while fetching wallet balance"
        className="mt-8"
      />
    )
  }

  return (
    <div>
      <form
        id="specification-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.AppField name="raisingTokenUnit">
            {(field) => (
              <field.SelectField
                label="Token to be raised"
                placeholder="Select a token"
                items={SUPPORTED_RAISING_TOKENS_UNITS.map((unit) => ({
                  label: <UnitDisplay unit={unit} />,
                  value: unit,
                }))}
                onChangeListener={(prevUnit, newUnit) => {
                  field.form.setFieldValue(
                    'projectMinCommitment',
                    (currentMinCommitment) =>
                      currentMinCommitment != null
                        ? transformQuantityToNewUnitDecimals(
                            currentMinCommitment,
                            prevUnit,
                            newUnit,
                            trpc,
                            queryClient,
                          )
                        : currentMinCommitment,
                  )

                  field.form.setFieldValue(
                    'projectMaxCommitment',
                    (currentMaxCommitment) =>
                      currentMaxCommitment != null
                        ? transformQuantityToNewUnitDecimals(
                            currentMaxCommitment,
                            prevUnit,
                            newUnit,
                            trpc,
                            queryClient,
                          )
                        : currentMaxCommitment,
                  )
                }}
              />
            )}
          </form.AppField>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form.AppField name="projectMinCommitment">
              {(field) => (
                <form.Subscribe
                  selector={(state) => state.values.raisingTokenUnit}
                >
                  {(raisingTokenUnit) => (
                    <field.UnitQuantityField
                      label="Minimum tokens to raise"
                      unit={raisingTokenUnit}
                    />
                  )}
                </form.Subscribe>
              )}
            </form.AppField>

            <form.AppField name="projectMaxCommitment">
              {(field) => (
                <form.Subscribe
                  selector={(state) => state.values.raisingTokenUnit}
                >
                  {(raisingTokenUnit) => (
                    <field.UnitQuantityField
                      label="Maximum tokens to raise"
                      unit={raisingTokenUnit}
                      isOptional
                    />
                  )}
                </form.Subscribe>
              )}
            </form.AppField>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-foreground text-xl">
              Liquidity pools configuration
            </h2>
            <div className="rounded-xl border border-border/50 p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 lg:grid-cols-2">
                <div className="space-y-10">
                  <div>
                    <form.AppField name="raisedTokensPoolPartPercentage">
                      {(field) => (
                        <field.SliderField
                          label="How many of the raised tokens will be used to open liquidity pool(s)"
                          tooltip="As the launch creator, you will own the pool share tokens and they will be vested"
                          min={MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE}
                          max={100}
                          step={1}
                        />
                      )}
                    </form.AppField>

                    <form.Subscribe
                      selector={(state) =>
                        state.values.raisedTokensPoolPartPercentage
                      }
                    >
                      {(raisedTokensPoolPartPercentage) => (
                        <div className="mt-4 flex flex-row justify-between">
                          <p className="text-muted-foreground text-sm">
                            <strong>For pool(s):</strong>{' '}
                            {raisedTokensPoolPartPercentage}%
                          </p>
                          <p className="text-muted-foreground text-sm">
                            <strong>For launch creator (you):</strong>{' '}
                            {100 - raisedTokensPoolPartPercentage}%
                          </p>
                        </div>
                      )}
                    </form.Subscribe>
                  </div>

                  <form.AppField name="projectTokensToPool">
                    {(field) => (
                      <field.UnitQuantityField
                        label="Additional project tokens committed to liquidity pool(s)"
                        unit={
                          fullDraft.tokenInformation.projectTokenToSale.unit
                        }
                      />
                    )}
                  </form.AppField>

                  <form.Subscribe
                    selector={(state) => state.values.projectTokensToPool}
                  >
                    {(projectTokensToPool) => {
                      const totalProjectTokens =
                        fullDraft.tokenInformation.projectTokenToSale.quantity +
                        (projectTokensToPool ?? 0n)
                      const projectTokensBalance =
                        walletBalance[
                          fullDraft.tokenInformation.projectTokenToSale.unit
                        ] ?? 0n

                      const hasInsufficientBalance =
                        totalProjectTokens > projectTokensBalance

                      return (
                        <Field
                          orientation="horizontal"
                          data-invalid={hasInsufficientBalance}
                        >
                          <FieldContent>
                            <FieldLabel>
                              Total project tokens used for launch
                            </FieldLabel>
                            <FieldDescription>
                              For sale + additional project tokens committed to
                              liquidity pool(s)
                            </FieldDescription>

                            {hasInsufficientBalance && (
                              <FieldError
                                errors={[
                                  {message: 'Insufficient token balance'},
                                ]}
                              />
                            )}
                          </FieldContent>

                          <AssetQuantity
                            unit={
                              fullDraft.tokenInformation.projectTokenToSale.unit
                            }
                            quantity={totalProjectTokens}
                          />
                        </Field>
                      )
                    }}
                  </form.Subscribe>
                </div>

                <form.AppField name="splitBps">
                  {(field) => (
                    <PoolAllocatorField
                      splitBps={field.state.value}
                      onSplitBpsChange={field.handleChange}
                      errors={field.state.meta.errors}
                      isInvalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                  )}
                </form.AppField>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-xl">
              Liquidity preview
            </h3>
            <form.Subscribe
              selector={({
                values: {
                  raisingTokenUnit,
                  splitBps,
                  projectMinCommitment,
                  projectMaxCommitment,
                  raisedTokensPoolPartPercentage,
                  projectTokensToPool,
                },
              }) => ({
                raisingTokenUnit,
                splitBps,
                projectMinCommitment,
                projectMaxCommitment,
                raisedTokensPoolPartPercentage,
                projectTokensToPool,
              })}
            >
              {(values) => {
                const isValid =
                  !!values.projectMinCommitment &&
                  (values.projectMaxCommitment == null ||
                    values.projectMaxCommitment >=
                      values.projectMinCommitment) &&
                  !!values.projectTokensToPool

                return isValid ? (
                  <LiquidityPreview
                    projectTokenUnit={
                      fullDraft.tokenInformation.projectTokenToSale.unit
                    }
                    raisingTokenUnit={values.raisingTokenUnit}
                    projectTokensForSale={
                      fullDraft.tokenInformation.projectTokenToSale.quantity
                    }
                    projectMinCommitment={values.projectMinCommitment!}
                    projectMaxCommitment={values.projectMaxCommitment}
                    raisedTokensPoolPartPercentage={BigInt(
                      values.raisedTokensPoolPartPercentage,
                    )}
                    projectTokensToPool={values.projectTokensToPool!}
                    splitBps={values.splitBps}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Fill in all fields to show the preview of the liquidity
                    pools
                  </p>
                )
              }}
            </form.Subscribe>
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
        <Button type="submit" form="specification-form">
          Next
        </Button>
      </Stepper.Controls>
    </div>
  )
}
