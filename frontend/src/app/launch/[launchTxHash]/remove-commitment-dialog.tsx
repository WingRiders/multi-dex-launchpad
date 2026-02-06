import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  type AddRemoveCommitmentArgs,
  addRemoveCommitment,
  calculateTxValidityIntervalBeforeLaunchEnd,
  type LaunchpadConfig,
  LOVELACE_UNIT,
} from '@wingriders/multi-dex-launchpad-common'
import {useEffect, useMemo} from 'react'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {GridItem} from '@/components/grid-item'
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
import {formatDateTime} from '@/helpers/format'
import {queryKeyFactory} from '@/helpers/query-key'
import {useUpdatedTime} from '@/helpers/time'
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
import {useNodeRefScripts} from './helpers'
import type {Node} from './types'

type RemoveCommitmentDialogProps = {
  launchTxHash: string
  config: Pick<LaunchpadConfig, 'raisingToken' | 'endTime'>
  node: Node | null
  connectedWallet: ConnectedWallet
  onClose: () => void
}

export const RemoveCommitmentDialog = ({
  launchTxHash,
  config,
  node,
  connectedWallet,
  onClose,
}: RemoveCommitmentDialogProps) => {
  return (
    <Dialog
      open={!!node}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        {node && (
          <RemoveCommitmentDialogContent
            launchTxHash={launchTxHash}
            config={config}
            node={node}
            connectedWallet={connectedWallet}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type RemoveCommitmentDialogContentProp = {
  launchTxHash: string
  config: Pick<LaunchpadConfig, 'raisingToken' | 'endTime'>
  node: Node
  connectedWallet: ConnectedWallet
  onClose: () => void
}

const RemoveCommitmentDialogContent = ({
  launchTxHash,
  config,
  node,
  connectedWallet,
  onClose,
}: RemoveCommitmentDialogContentProp) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const network = env('NEXT_PUBLIC_NETWORK')

  const time = useUpdatedTime(
    useMemo(() => [config.endTime], [config.endTime]),
    10_000,
  )

  const {
    data: utxo,
    isLoading: isLoadingUtxo,
    error: utxoError,
  } = useQuery(
    trpc.utxo.queryOptions({
      txHash: node.txHash,
      outputIndex: node.outputIndex,
    }),
  )

  const {
    data: previousNodeUtxo,
    isLoading: isLoadingPreviousNodeUtxo,
    error: previousNodeUtxoError,
  } = useQuery(
    trpc.previousNodeUTxO.queryOptions({
      launchTxHash,
      keyHash: node.keyHash,
      keyIndex: node.keyIndex,
    }),
  )

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

  const {
    nodeValidatorRef,
    nodePolicyRef,
    isLoading: isLoadingRefScripts,
    isError: isRefScriptsError,
    uniqueErrorMessages: refScriptsUniqueErrorMessages,
  } = useNodeRefScripts(launchTxHash)

  const validityInterval = calculateTxValidityIntervalBeforeLaunchEnd(
    network,
    config.endTime,
    time,
  )

  const buildArgs: AddRemoveCommitmentArgs | undefined =
    utxo != null &&
    previousNodeUtxo != null &&
    nodeValidatorRef != null &&
    nodePolicyRef != null
      ? {
          nodeUtxoToRemove: utxo,
          previousNodeUtxo: previousNodeUtxo,
          nodeValidatorRef: nodeValidatorRef,
          nodePolicyRef: nodePolicyRef,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
          lowerTimeLimitSlot: validityInterval.validityStartSlot,
          upperTimeLimitSlot: validityInterval.validityEndSlot,
        }
      : undefined

  const {
    data: buildRemoveCommitmentTxResult,
    isFetching: isBuildingRemoveCommitmentTx,
    error: buildRemoveCommitmentTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildRemoveCommitmentTx(
      utxo?.input,
      previousNodeUtxo?.input,
    ),
    queryFn:
      buildArgs != null &&
      walletCollateralUtxo != null &&
      walletUtxos != null &&
      connectedWallet != null &&
      nodeValidatorRef != null &&
      nodePolicyRef != null &&
      utxo != null &&
      previousNodeUtxo != null
        ? async () => {
            const txBuilder = await initTxBuilder({
              wallet: connectedWallet.wallet,
              network,
              walletUtxos,
              collateralUtxo: walletCollateralUtxo,
              changeAddress: connectedWallet.address,
              additionalFetcherUtxos: [
                utxo,
                previousNodeUtxo,
                nodeValidatorRef,
                nodePolicyRef,
              ],
            })

            addRemoveCommitment(txBuilder, buildArgs)

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
  }, [buildRemoveCommitmentTxResult, resetSignAndSubmitTx])

  const handleRemove = async () => {
    if (buildRemoveCommitmentTxResult == null) return

    const res = await signAndSubmitTx(buildRemoveCommitmentTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Withdraw commitment</DialogTitle>
      </DialogHeader>

      <div>
        <GridItem
          label="Committed"
          value={
            <AssetQuantity
              unit={config.raisingToken}
              quantity={node.committed}
            />
          }
          direction="horizontal"
          className="justify-between"
        />
        <GridItem
          label="Created at"
          value={formatDateTime(node.createdTime)}
          direction="horizontal"
          className="justify-between"
        />

        {buildRemoveCommitmentTxResult && (
          <div className="mt-4 space-y-1">
            <GridItem
              label="Transaction fee"
              value={
                <AssetQuantity
                  unit={LOVELACE_UNIT}
                  quantity={buildRemoveCommitmentTxResult.fee}
                />
              }
              direction="horizontal"
              className="justify-between"
            />
          </div>
        )}

        <div className="space-y-2">
          {buildRemoveCommitmentTxError && (
            <ErrorAlert
              title="Error while building transaction"
              description={buildRemoveCommitmentTxError.message}
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

          {utxoError && (
            <ErrorAlert
              title="Error while fetching UTxO"
              description={utxoError.message}
            />
          )}
          {previousNodeUtxoError && (
            <ErrorAlert
              title="Error while fetching previous node UTxO"
              description={previousNodeUtxoError.message}
            />
          )}
          {isRefScriptsError && (
            <ErrorAlert
              title="Error while fetching reference scripts"
              description={refScriptsUniqueErrorMessages.join('. ')}
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
      </div>

      {time < config.endTime && (
        <DialogFooter>
          <Button
            className="w-full"
            variant="destructive"
            loading={
              isLoadingUtxo ||
              isLoadingPreviousNodeUtxo ||
              isBuildingRemoveCommitmentTx ||
              isSigningAndSubmittingTx ||
              isLoadingRefScripts ||
              isLoadingWalletUtxos ||
              isLoadingWalletCollateralUtxo
            }
            disabled={
              isBuildingRemoveCommitmentTx ||
              buildRemoveCommitmentTxResult == null ||
              isSigningAndSubmittingTx
            }
            onClick={handleRemove}
          >
            Withdraw
          </Button>
        </DialogFooter>
      )}

      <TxSubmittedDialog
        txHash={submitTxMutationResult.data}
        onOpenChange={() => {
          resetSignAndSubmitTx()
          onClose()
        }}
      />
    </>
  )
}
