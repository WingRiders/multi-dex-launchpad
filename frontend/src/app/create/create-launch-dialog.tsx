import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  addInitLaunch,
  calculateTxValidityIntervalBeforeLaunchStart,
  generateConstantContracts,
  generateLaunchContracts,
  INIT_LAUNCH_AGENT_LOVELACE,
  LOVELACE_UNIT,
} from '@wingriders/multi-dex-launchpad-common'
import {minutesToMilliseconds} from 'date-fns'
import {Loader2Icon} from 'lucide-react'
import {useRouter} from 'next/navigation'
import {type ReactNode, useEffect, useMemo} from 'react'
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
import {useTRPC} from '@/trpc/client'
import {getTxSendErrorMessage, getTxSignErrorMessage} from '@/wallet/errors'
import {
  invalidateWalletQueries,
  useSignAndSubmitTxMutation,
  useWalletUtxosQuery,
} from '@/wallet/queries'
import {buildConfigAndProjectInfo, findStarterUtxo} from './helpers'
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
        aria-describedby={undefined}
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
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const navigate = useRouter()

  const {deleteDraft} = useCreateLaunchStore(
    useShallow(({deleteDraft}) => ({deleteDraft})),
  )

  const {time} = useTime(minutesToMilliseconds(1))

  const {projectInformation, tokenInformation} = draft

  const network = env('NEXT_PUBLIC_NETWORK')

  const {
    data: walletUtxos,
    isLoading: isLoadingWalletUtxos,
    error: walletUtxosError,
  } = useWalletUtxosQuery()

  const starterUtxo = useMemo(() => {
    if (!walletUtxos) return undefined

    return findStarterUtxo(
      walletUtxos,
      tokenInformation.projectTokenToSale.unit,
    )
  }, [walletUtxos, tokenInformation.projectTokenToSale.unit])

  const configAndProjectInfo = useMemo(() => {
    if (!starterUtxo) return undefined

    return buildConfigAndProjectInfo(
      draft,
      network,
      starterUtxo.input,
      wallet.address,
    )
  }, [draft, network, starterUtxo, wallet.address])

  const {
    data: buildInitTxResult,
    isLoading: isLoadingBuildInitTx,
    error: buildInitTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildInitTx(draft, walletUtxos),
    queryFn:
      starterUtxo && configAndProjectInfo
        ? async () => {
            const {config, projectInfo} = configAndProjectInfo

            const constantContracts = await generateConstantContracts({
              wrPoolValidatorHash: config.wrPoolValidatorHash,
              wrPoolSymbol: config.wrPoolCurrencySymbol,
              sundaePoolScriptHash: config.sundaePoolScriptHash,
            })

            const launchpadContracts = await generateLaunchContracts(
              config,
              constantContracts,
            )

            const txBuilder = await initTxBuilder({wallet: wallet.wallet})

            const validityInterval =
              calculateTxValidityIntervalBeforeLaunchStart(
                network,
                config.startTime,
                time,
              )

            addInitLaunch(
              txBuilder,
              config,
              projectInfo,
              launchpadContracts,
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
    if (buildInitTxResult == null || configAndProjectInfo == null) return

    const res = await signAndSubmitTx(buildInitTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)

      queryClient.setQueryData(
        trpc.launch.queryKey({txHash: submitTxMutationResult.data}),
        {
          config: configAndProjectInfo.config,
          projectInfo: configAndProjectInfo.projectInfo,
          totalCommitted: 0n,
        },
      )

      queryClient.setQueryData(
        trpc.launches.queryKey({timeStatus: 'upcoming'}),
        (current) =>
          [
            ...(current ?? []),
            {
              txHash: res.txHash,
              title: projectInformation.title,
              description: projectInformation.description,
              logoIpfsUrl: projectInformation.logoUrl,
              startTime: new Date(configAndProjectInfo.config.startTime),
              endTime: new Date(configAndProjectInfo.config.endTime),
            },
          ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      )
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
      ) : buildInitTxResult && configAndProjectInfo ? (
        <div className="space-y-1">
          <DataRow
            label="Collateral"
            value={
              <AssetQuantity
                unit={LOVELACE_UNIT}
                quantity={configAndProjectInfo.config.collateral}
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
        {!starterUtxo && (
          <ErrorAlert title="No UTxO with project token found" />
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
