import {revalidateLogic} from '@tanstack/react-form'
import {useQueryClient} from '@tanstack/react-query'
import {
  isLovelaceUnit,
  type SetNullable,
} from '@wingriders/multi-dex-launchpad-common'
import {Loader2Icon} from 'lucide-react'
import {useMemo} from 'react'
import type {OverrideProperties} from 'type-fest'
import {useShallow} from 'zustand/shallow'
import {AssetInput} from '@/components/asset-input/asset-input'
import {EMPTY_ASSET_INPUT_VALUE} from '@/components/asset-input/constants'
import {isAssetInputValueNonEmpty} from '@/components/asset-input/helpers'
import type {AssetInputItem} from '@/components/asset-input/types'
import {Alert, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Field, FieldError, FieldGroup, FieldLabel} from '@/components/ui/field'
import {useAppForm} from '@/forms/context'
import {transformQuantityToNewUnitDecimals} from '@/metadata/helpers'
import {useTRPC} from '@/trpc/client'
import {useWalletBalanceQuery} from '@/wallet/queries'
import {isLaunchDraftStageAfter} from './helpers'
import {type TokenInformation, tokenInformationSchema} from './schemas'
import {Stepper, useStepper} from './stepper'
import {useCreateLaunchStore} from './store'
import {LaunchDraftStage} from './types'

type FormInputData = OverrideProperties<
  TokenInformation,
  {
    projectTokenToSale: SetNullable<
      TokenInformation['projectTokenToSale'],
      'quantity' | 'unit'
    >
  }
>

export const TokenInformationForm = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const {draft, saveStageData} = useCreateLaunchStore(
    useShallow(({draft, saveStageData}) => ({draft, saveStageData})),
  )

  const {
    data: walletBalance,
    isLoading: isWalletBalanceLoading,
    balanceState,
  } = useWalletBalanceQuery()

  const assetInputItems = useMemo(
    () =>
      walletBalance
        ? Object.entries(walletBalance)
            .filter(([unit]) => !isLovelaceUnit(unit))
            .map<AssetInputItem>(([unit, balance]) => ({
              unit,
              balance,
            }))
            .sort((a, b) => {
              if (a.balance > b.balance) return -1
              if (a.balance < b.balance) return 1
              return 0
            })
        : null,
    [walletBalance],
  )

  const stepper = useStepper()

  const defaultFormValues: FormInputData =
    draft && isLaunchDraftStageAfter(draft, LaunchDraftStage.TOKEN_INFORMATION)
      ? draft.tokenInformation
      : {
          projectTokenToSale: EMPTY_ASSET_INPUT_VALUE,
        }

  const form = useAppForm({
    defaultValues: defaultFormValues,
    onSubmit: ({value}) => {
      const data = tokenInformationSchema.parse(value)

      saveStageData({
        stage: LaunchDraftStage.TOKEN_INFORMATION,
        tokenInformation: data,
      })
      stepper.next()
    },
    validators: {
      onDynamic: tokenInformationSchema,
    },
    validationLogic: revalidateLogic(),
  })

  if (!walletBalance) {
    return isWalletBalanceLoading ? (
      <div className="flex h-60 items-center justify-center">
        <Loader2Icon className="size-8 animate-spin" />
      </div>
    ) : (
      <Alert variant="destructive" className="mt-8">
        <AlertTitle>Error while fetching wallet balance</AlertTitle>
      </Alert>
    )
  }

  return (
    <div>
      <form
        id="token-information-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field
            name="projectTokenToSale"
            validators={{
              onChange: ({value}) => {
                if (isAssetInputValueNonEmpty(value)) {
                  const selectedUnitBalance = walletBalance[value.unit] ?? 0n

                  if (value.quantity > selectedUnitBalance) {
                    return {message: 'Insufficient token balance'}
                  }
                }

                return undefined
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Project token and quantity for sale
                  </FieldLabel>
                  <AssetInput
                    items={assetInputItems}
                    value={field.state.value}
                    onChange={(value) => {
                      const newValue = {...value}
                      const oldUnit = field.state.value.unit

                      if (value.quantity && value.unit !== oldUnit) {
                        newValue.quantity = transformQuantityToNewUnitDecimals(
                          value.quantity,
                          oldUnit,
                          value.unit,
                          trpc,
                          queryClient,
                        )
                      }
                      field.handleChange(newValue)
                    }}
                    showMaxButton
                    balanceState={balanceState}
                  />

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>
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
        <Button type="submit" form="token-information-form">
          Next
        </Button>
      </Stepper.Controls>
    </div>
  )
}
