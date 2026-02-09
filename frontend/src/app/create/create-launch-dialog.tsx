import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  addInitLaunch,
  COMMIT_FOLD_FEE_ADA,
  calculateTxValidityIntervalBeforeLaunchStart,
  DAO_ADMIN_PUB_KEY_HASH,
  DAO_FEE_DENOMINATOR,
  DAO_FEE_NUMERATOR,
  DAO_FEE_RECEIVER_BECH32_ADDRESS,
  DISABLED_TIER_CS,
  generateConstantContracts,
  generateLaunchContracts,
  INIT_LAUNCH_AGENT_LOVELACE,
  LAUNCH_COLLATERAL,
  type LaunchConfig,
  LOVELACE_UNIT,
  MAX_INT64,
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
import {minutesToMilliseconds} from 'date-fns'
import {Loader2Icon} from 'lucide-react'
import {useRouter} from 'next/navigation'
import {type ReactNode, useEffect} from 'react'
import {useShallow} from 'zustand/shallow'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {InfoTooltip} from '@/components/info-tooltip'
import {TxSubmittedDialog} from '@/components/tx-submitted-dialog'
import {Button} from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {env} from '@/config'
import {queryKeyFactory} from '@/helpers/query-key'
import {useTime} from '@/helpers/time'
import {getTxFee, initTxBuilder} from '@/helpers/tx'
import type {ConnectedWallet} from '@/store/connected-wallet'
import {getTxSendErrorMessage, getTxSignErrorMessage} from '@/wallet/errors'
import {
  invalidateWalletQueries,
  useSignAndSubmitTxMutation,
  useWalletUtxosQuery,
} from '@/wallet/queries'
import {SUNDAE_FEE_TOLERANCE} from '../constants'
import {findStarterUtxo, getLaunchStartTimeForce} from './helpers'
import {useCreateLaunchStore} from './store'
import type {CompleteDataForDraftStage, LaunchDraftStage} from './types'

type CreateLaunchDialogProps = Pick<
  React.ComponentProps<typeof Dialog>,
  'open' | 'onOpenChange'
> & {
  draft: CompleteDataForDraftStage<LaunchDraftStage.OVERVIEW>
  wallet: ConnectedWallet
}

export const CreateLaunchDialog = ({
  open,
  onOpenChange,
  draft,
  wallet,
}: CreateLaunchDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        className="max-h-[80vh] overflow-y-auto"
      >
        <CreateLaunchDialogContent
          onOpenChange={onOpenChange}
          draft={draft}
          wallet={wallet}
        />
      </DialogContent>
    </Dialog>
  )
}

type CreateLaunchDialogContentProps = Pick<
  React.ComponentProps<typeof Dialog>,
  'onOpenChange'
> & {
  draft: CompleteDataForDraftStage<LaunchDraftStage.OVERVIEW>
  wallet: ConnectedWallet
}

const CreateLaunchDialogContent = ({
  onOpenChange,
  draft,
  wallet,
}: CreateLaunchDialogContentProps) => {
  const navigate = useRouter()

  const {deleteDraft} = useCreateLaunchStore(
    useShallow(({deleteDraft}) => ({deleteDraft})),
  )

  const queryClient = useQueryClient()
  const {time} = useTime(minutesToMilliseconds(1))

  const {projectInformation, tokenInformation, specification, userAccess} =
    draft

  const network = env('NEXT_PUBLIC_NETWORK')

  const {
    data: walletUtxos,
    isLoading: isLoadingWalletUtxos,
    error: walletUtxosError,
  } = useWalletUtxosQuery()

  const {
    data: buildInitTxResult,
    isLoading: isLoadingBuildInitTx,
    error: buildInitTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildInitTx(draft, walletUtxos),
    queryFn: walletUtxos
      ? async () => {
          const starterUtxo = findStarterUtxo(
            walletUtxos,
            tokenInformation.projectTokenToSale.unit,
          )
          if (starterUtxo == null) {
            throw new Error('No UTxO with project token found')
          }

          const launchStartTime = getLaunchStartTimeForce(userAccess)

          const launchConfig: LaunchConfig = {
            ownerBech32Address: wallet.address,
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
            projectMaxCommitment:
              specification.projectMaxCommitment ?? MAX_INT64,
            totalTokens:
              tokenInformation.projectTokenToSale.quantity +
              specification.projectTokensToPool,
            tokensToDistribute: tokenInformation.projectTokenToSale.quantity,
            raisedTokensPoolPartPercentage:
              specification.raisedTokensPoolPartPercentage,
            daoFeeNumerator: DAO_FEE_NUMERATOR,
            daoFeeDenominator: DAO_FEE_DENOMINATOR,
            daoFeeReceiverBech32Address:
              DAO_FEE_RECEIVER_BECH32_ADDRESS[network],
            daoAdminPubKeyHash: DAO_ADMIN_PUB_KEY_HASH[network],
            collateral: LAUNCH_COLLATERAL,
            starter: starterUtxo.input,
            vestingPeriodDuration: VESTING_PERIOD_DURATION,
            vestingPeriodDurationToFirstUnlock:
              VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
            vestingPeriodInstallments: VESTING_PERIOD_INSTALLMENTS,
            vestingPeriodStart: userAccess.endTime.getTime(),
            vestingValidatorHash: VESTING_VALIDATOR_HASH,
            presaleTierCs:
              userAccess.presaleTier?.nftPolicyId ?? DISABLED_TIER_CS,
            presaleTierStartTime:
              userAccess.presaleTier?.startTime.getTime() ??
              userAccess.endTime.getTime() + 1,
            defaultStartTime:
              userAccess.defaultTier?.startTime.getTime() ??
              userAccess.endTime.getTime() + 1,
            presaleTierMinCommitment:
              userAccess.presaleTier?.minCommitment ?? 0n,
            defaultTierMinCommitment:
              userAccess.defaultTier?.minCommitment ?? 0n,
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

          const constantContracts = await generateConstantContracts({
            wrPoolValidatorHash: launchConfig.wrPoolValidatorHash,
            wrPoolSymbol: launchConfig.wrPoolCurrencySymbol,
            sundaePoolScriptHash: launchConfig.sundaePoolScriptHash,
          })

          const launchContracts = await generateLaunchContracts(
            launchConfig,
            constantContracts,
          )

          const txBuilder = await initTxBuilder({wallet: wallet.wallet})

          const validityInterval = calculateTxValidityIntervalBeforeLaunchStart(
            network,
            launchConfig.startTime,
            time,
          )

          addInitLaunch(
            txBuilder,
            launchConfig,
            projectInfo,
            launchContracts,
            env('NEXT_PUBLIC_AGENT_ADDRESS'),
            starterUtxo.output,
            validityInterval.validityStartSlot,
            validityInterval.validityEndSlot,
          )

          const tx = await txBuilder.complete()
          const fee = await getTxFee(tx)

          return {
            tx,
            fee,
            launchConfig,
          }
        }
      : skipToken,
    staleTime: 0,
  })

  const {
    signAndSubmitTx,
    signTxMutationResult,
    submitTxMutationResult,
    isPending: isSigningAndSubmittingTx,
    isError: isSignAndSubmitTxError,
    reset: resetSignAndSubmitTx,
  } = useSignAndSubmitTxMutation()

  const handleCreate = async () => {
    if (buildInitTxResult == null) return

    const res = await signAndSubmitTx(buildInitTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)
    }
  }

  const handleTxSubmittedDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetSignAndSubmitTx()
      deleteDraft()
      navigate.push(
        submitTxMutationResult?.data
          ? `/launch/${submitTxMutationResult.data}`
          : '/',
      )
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset the error state of the sign and submit tx when the build tx result is updated
  useEffect(() => {
    if (isSignAndSubmitTxError) resetSignAndSubmitTx()
  }, [buildInitTxResult, resetSignAndSubmitTx])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create a new token launch</DialogTitle>
        <h2 className="font-semibold text-2xl text-foreground">
          {projectInformation.title}
        </h2>
      </DialogHeader>

      {isLoadingBuildInitTx || isLoadingWalletUtxos ? (
        <div className="flex h-20 items-center justify-center">
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Building transaction
          </p>
        </div>
      ) : buildInitTxResult ? (
        <div className="space-y-1">
          <DataRow
            label="Collateral"
            value={
              <AssetQuantity
                unit={LOVELACE_UNIT}
                quantity={buildInitTxResult.launchConfig.collateral}
              />
            }
            tooltip="The collateral is a deposit that is required to create a token launch. It will be returned to you after the launch."
          />

          <DataRow
            label="Deposit for the launchpad agent"
            value={
              <AssetQuantity
                unit={LOVELACE_UNIT}
                quantity={INIT_LAUNCH_AGENT_LOVELACE}
              />
            }
            tooltip="The deposit for the launchpad agent is a deposit that is required to deploy the launch smart contracts. Part of this will be returned to you after the launch."
          />

          <DataRow
            label="Transaction fee"
            value={
              <AssetQuantity
                unit={LOVELACE_UNIT}
                quantity={buildInitTxResult.fee}
              />
            }
          />
        </div>
      ) : null}

      <div className="space-y-2">
        {buildInitTxError && (
          <ErrorAlert
            title="Error while building transaction"
            description={buildInitTxError.message}
          />
        )}
        {signTxMutationResult.error && (
          <ErrorAlert
            title="Error while signing transaction"
            description={getTxSignErrorMessage(signTxMutationResult.error)}
          />
        )}
        {submitTxMutationResult.error && (
          <ErrorAlert
            title="Error while submitting transaction"
            description={getTxSendErrorMessage(submitTxMutationResult.error)}
          />
        )}
        {walletUtxosError && (
          <ErrorAlert
            title="Error while fetching wallet UTxOs"
            description={walletUtxosError.message}
          />
        )}
      </div>

      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => onOpenChange?.(false)}
          disabled={isLoadingBuildInitTx || isSigningAndSubmittingTx}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={
            !buildInitTxResult ||
            isLoadingBuildInitTx ||
            isSigningAndSubmittingTx
          }
          loading={isSigningAndSubmittingTx}
        >
          Create
        </Button>
      </DialogFooter>

      <TxSubmittedDialog
        txHash={submitTxMutationResult.data}
        onOpenChange={handleTxSubmittedDialogOpenChange}
      />
    </>
  )
}

type DataRowProps = {
  label: string
  value: ReactNode
  tooltip?: string
}

const DataRow = ({label, value, tooltip}: DataRowProps) => {
  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="font-medium text-sm">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <span className="font-bold text-lg">{value}</span>
    </div>
  )
}
