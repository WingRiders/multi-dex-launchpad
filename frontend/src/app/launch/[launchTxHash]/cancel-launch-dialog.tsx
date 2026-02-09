import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  type AddCancelLaunchArgs,
  addCancelLaunch,
  calculateTxValidityIntervalBeforeLaunchStart,
  type LaunchConfig,
  LOVELACE_UNIT,
} from '@wingriders/multi-dex-launchpad-common'
import {useEffect} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {GridItem} from '@/components/grid-item'
import {TxSubmittedDialog} from '@/components/tx-submitted-dialog'
import {Button} from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
  useWalletCollateralUtxoQuery,
  useWalletUtxosQuery,
} from '@/wallet/queries'
import {useTokensHolderFirstRefScripts} from './helpers'

type CancelLaunchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  launchTxHash: string
  config: Pick<LaunchConfig, 'startTime'>
  connectedWallet: ConnectedWallet
}

export const CancelLaunchDialog = ({
  open,
  onOpenChange,
  launchTxHash,
  config,
  connectedWallet,
}: CancelLaunchDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CancelLaunchDialogContent
          launchTxHash={launchTxHash}
          config={config}
          connectedWallet={connectedWallet}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}

type CancelLaunchDialogContentProps = {
  launchTxHash: string
  config: Pick<LaunchConfig, 'startTime'>
  connectedWallet: ConnectedWallet
  onOpenChange: (open: boolean) => void
}

const CancelLaunchDialogContent = ({
  launchTxHash,
  config,
  connectedWallet,
  onOpenChange,
}: CancelLaunchDialogContentProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const network = env('NEXT_PUBLIC_NETWORK')

  const {time} = useTime(10_000)

  const {
    data: firstProjectTokensHolderUTxO,
    isLoading: isLoadingFirstProjectTokensHolderUTxO,
    error: firstProjectTokensHolderUTxOError,
  } = useQuery(trpc.firstProjectTokensHolderUTxO.queryOptions({launchTxHash}))

  const {
    firstProjectTokensHolderValidatorRef,
    projectTokensHolderPolicyRef,
    isLoading: isLoadingTokensHolderFirstRefScripts,
    isError: isTokensHolderFirstRefScriptsError,
    uniqueErrorMessages: tokensHolderFirstRefScriptsUniqueErrorMessages,
  } = useTokensHolderFirstRefScripts(launchTxHash)

  const {
    data: walletUtxos,
    isLoading: isLoadingWalletUtxos,
    error: walletUtxosError,
  } = useWalletUtxosQuery()

  const {
    data: walletCollateralUtxo,
    isLoading: isLoadingWalletCollateralUtxo,
    error: walletCollateralUtxoError,
  } = useWalletCollateralUtxoQuery({
    walletUtxos,
    isLoadingWalletUtxos,
  })

  const validityInterval = calculateTxValidityIntervalBeforeLaunchStart(
    network,
    config.startTime,
    time,
  )

  const buildArgs: AddCancelLaunchArgs | undefined =
    firstProjectTokensHolderUTxO != null &&
    firstProjectTokensHolderValidatorRef != null &&
    projectTokensHolderPolicyRef != null
      ? {
          tokensHolderFirstUTxO: firstProjectTokensHolderUTxO,
          tokensHolderFirstValidatorRef: firstProjectTokensHolderValidatorRef,
          tokensHolderPolicyRef: projectTokensHolderPolicyRef,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
          lowerTimeLimitSlot: validityInterval.validityStartSlot,
          upperTimeLimitSlot: validityInterval.validityEndSlot,
        }
      : undefined

  const {
    data: buildCancelLaunchTxResult,
    isFetching: isBuildingCancelLaunchTx,
    error: buildCancelLaunchTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildCancelLaunchTx(launchTxHash),
    queryFn:
      buildArgs != null &&
      walletCollateralUtxo != null &&
      walletUtxos != null &&
      connectedWallet != null &&
      firstProjectTokensHolderValidatorRef != null &&
      projectTokensHolderPolicyRef != null &&
      firstProjectTokensHolderUTxO != null
        ? async () => {
            const txBuilder = await initTxBuilder({
              wallet: connectedWallet.wallet,
              network,
              walletUtxos,
              collateralUtxo: walletCollateralUtxo,
              changeAddress: connectedWallet.address,
              additionalFetcherUtxos: [
                firstProjectTokensHolderUTxO,
                firstProjectTokensHolderValidatorRef,
                projectTokensHolderPolicyRef,
              ],
            })

            addCancelLaunch(txBuilder, buildArgs)

            const tx = await txBuilder.complete()
            const fee = await getTxFee(tx)

            return {tx, fee}
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset the error state of the sign and submit tx when the build tx result is updated
  useEffect(() => {
    if (isSignAndSubmitTxError) resetSignAndSubmitTx()
  }, [buildCancelLaunchTxResult, resetSignAndSubmitTx])

  const handleCancel = async () => {
    if (buildCancelLaunchTxResult == null) return

    const res = await signAndSubmitTx(buildCancelLaunchTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cancel launch</DialogTitle>
      </DialogHeader>

      {buildCancelLaunchTxResult && (
        <div className="mt-4 space-y-1">
          <GridItem
            label="Transaction fee"
            value={
              <AssetQuantity
                unit={LOVELACE_UNIT}
                quantity={buildCancelLaunchTxResult.fee}
              />
            }
            direction="horizontal"
            className="justify-between"
          />
        </div>
      )}

      <Button
        variant="destructive"
        disabled={
          isBuildingCancelLaunchTx ||
          buildCancelLaunchTxResult == null ||
          isSigningAndSubmittingTx
        }
        loading={
          isSigningAndSubmittingTx ||
          isBuildingCancelLaunchTx ||
          isLoadingFirstProjectTokensHolderUTxO ||
          isLoadingTokensHolderFirstRefScripts ||
          isLoadingWalletUtxos ||
          isLoadingWalletCollateralUtxo
        }
        onClick={handleCancel}
      >
        Cancel launch
      </Button>

      <div className="space-y-2">
        {buildCancelLaunchTxError && (
          <ErrorAlert
            title="Error while building transaction"
            description={buildCancelLaunchTxError.message}
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

        {firstProjectTokensHolderUTxOError && (
          <ErrorAlert
            title="Error while fetching first project tokens holder UTxO"
            description={firstProjectTokensHolderUTxOError.message}
          />
        )}
        {isTokensHolderFirstRefScriptsError && (
          <ErrorAlert
            title="Error while fetching reference scripts"
            description={tokensHolderFirstRefScriptsUniqueErrorMessages.join(
              '. ',
            )}
          />
        )}
        {walletUtxosError && (
          <ErrorAlert
            title="Error while fetching wallet UTxOs"
            description={walletUtxosError.message}
          />
        )}
        {!walletCollateralUtxo &&
          !isLoadingWalletCollateralUtxo &&
          !walletCollateralUtxoError && (
            <ErrorAlert
              title="No collateral UTxO found"
              description="You need to have a collateral UTxO to contribute to the launch"
            />
          )}
        {walletCollateralUtxoError && (
          <ErrorAlert
            title="Error while fetching collateral UTxO"
            description={walletCollateralUtxoError.message}
          />
        )}
      </div>

      <TxSubmittedDialog
        txHash={submitTxMutationResult.data}
        onOpenChange={() => {
          resetSignAndSubmitTx()
          onOpenChange(false)
        }}
      />
    </>
  )
}
