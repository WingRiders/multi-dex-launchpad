import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  type AddReclaimCommitmentsArgs,
  addReclaimCommitments,
  calculateTxValidityInterval,
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
  useWalletCollateralUtxoQuery,
  useWalletUtxosQuery,
} from '@/wallet/queries'
import {useNodeRefScripts} from './helpers'
import type {Node} from './types'

type ReclaimNodesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedWallet: ConnectedWallet
  launchTxHash: string
  config: Pick<LaunchConfig, 'raisingToken'>
  unspentNodes: Node[]
}

export const ReclaimNodesDialog = ({
  open,
  onOpenChange,
  connectedWallet,
  launchTxHash,
  config,
  unspentNodes,
}: ReclaimNodesDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ReclaimNodesDialogContent
          onOpenChange={onOpenChange}
          connectedWallet={connectedWallet}
          launchTxHash={launchTxHash}
          config={config}
          unspentNodes={unspentNodes}
        />
      </DialogContent>
    </Dialog>
  )
}

type ReclaimNodesDialogContentProps = {
  onOpenChange: (open: boolean) => void
  connectedWallet: ConnectedWallet
  launchTxHash: string
  config: Pick<LaunchConfig, 'raisingToken'>
  unspentNodes: Node[]
}

const ReclaimNodesDialogContent = ({
  onOpenChange,
  connectedWallet,
  launchTxHash,
  config,
  unspentNodes,
}: ReclaimNodesDialogContentProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const network = env('NEXT_PUBLIC_NETWORK')

  const {time} = useTime(10_000)

  const valueToReclaim = unspentNodes.reduce(
    (acc, node) => acc + node.committed,
    0n,
  )

  const {
    data: nodeUtxos,
    isLoading: isLoadingNodeUtxos,
    error: nodeUtxosError,
  } = useQuery(
    trpc.utxos.queryOptions(
      unspentNodes.map((node) => ({
        txHash: node.txHash,
        outputIndex: node.outputIndex,
      })),
    ),
  )

  const {
    nodeValidatorRef,
    nodePolicyRef,
    isLoading: isLoadingRefScripts,
    isError: isRefScriptsError,
    uniqueErrorMessages: refScriptsUniqueErrorMessages,
  } = useNodeRefScripts(launchTxHash)

  const {
    data: failProofUtxo,
    isLoading: isLoadingFailProofUtxo,
    error: failProofUtxoError,
  } = useQuery(
    trpc.failProofUtxo.queryOptions({
      launchTxHash,
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

  const validityInterval = calculateTxValidityInterval(network, time)
  const buildArgs: AddReclaimCommitmentsArgs | undefined =
    failProofUtxo != null &&
    nodeUtxos != null &&
    nodeValidatorRef != null &&
    nodePolicyRef != null &&
    failProofUtxo != null
      ? {
          nodeUtxos,
          nodeValidatorRef,
          nodePolicyRef,
          failProofInput: failProofUtxo.input,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
          lowerTimeLimitSlot: validityInterval.validityStartSlot,
          upperTimeLimitSlot: validityInterval.validityEndSlot,
        }
      : undefined

  const {
    data: buildReclaimNodesTxResult,
    isFetching: isBuildingReclaimNodesTx,
    error: buildReclaimNodesTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildReclaimNodesTx(buildArgs),
    queryFn:
      buildArgs != null &&
      walletCollateralUtxo != null &&
      walletUtxos != null &&
      connectedWallet != null &&
      failProofUtxo != null &&
      nodeUtxos != null &&
      nodeValidatorRef != null &&
      nodePolicyRef != null &&
      failProofUtxo != null
        ? async () => {
            const txBuilder = await initTxBuilder({
              wallet: connectedWallet.wallet,
              network,
              walletUtxos,
              collateralUtxo: walletCollateralUtxo,
              changeAddress: connectedWallet.address,
              additionalFetcherUtxos: [
                failProofUtxo,
                nodeValidatorRef,
                nodePolicyRef,
                ...nodeUtxos,
              ],
            })

            addReclaimCommitments(txBuilder, buildArgs)

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
  }, [buildReclaimNodesTxResult, resetSignAndSubmitTx])

  const handleClaim = async () => {
    if (buildReclaimNodesTxResult == null) return

    const res = await signAndSubmitTx(buildReclaimNodesTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)

      queryClient.setQueryData(
        trpc.userNodes.queryKey({
          launchTxHash,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
        }),
        (current) =>
          current?.map((n) => {
            const wasReclaimed = unspentNodes.some(
              (unspentNode) =>
                unspentNode.txHash === n.txHash &&
                unspentNode.outputIndex === n.outputIndex,
            )

            if (!wasReclaimed) return n

            return {
              ...n,
              isSpent: true,
            }
          }),
      )
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reclaim contributions</DialogTitle>
      </DialogHeader>

      <div>
        <GridItem
          label="Reclaimable value"
          value={
            <AssetQuantity
              unit={config.raisingToken}
              quantity={valueToReclaim}
            />
          }
          direction="horizontal"
          className="justify-between"
        />

        {buildReclaimNodesTxResult && (
          <div className="mt-4 space-y-1">
            <GridItem
              label="Transaction fee"
              value={
                <AssetQuantity
                  unit={LOVELACE_UNIT}
                  quantity={buildReclaimNodesTxResult.fee}
                />
              }
              direction="horizontal"
              className="justify-between"
            />
          </div>
        )}

        <div className="space-y-2">
          {buildReclaimNodesTxError && (
            <ErrorAlert
              title="Error while building transaction"
              description={buildReclaimNodesTxError.message}
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

          {failProofUtxoError && (
            <ErrorAlert
              title="Error while fetching pool proof"
              description={failProofUtxoError.message}
            />
          )}
          {!failProofUtxo ||
            !failProofUtxoError ||
            (!isLoadingFailProofUtxo && (
              <ErrorAlert title="Fail proof was not created yet, wait for the agent to create it" />
            ))}
          {nodeUtxosError && (
            <ErrorAlert
              title="Error while fetching nodes UTxOs"
              description={nodeUtxosError.message}
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

      <DialogFooter>
        <Button
          className="w-full"
          variant="destructive"
          loading={
            isLoadingFailProofUtxo ||
            isLoadingNodeUtxos ||
            isBuildingReclaimNodesTx ||
            isSigningAndSubmittingTx ||
            isLoadingWalletUtxos ||
            isLoadingWalletCollateralUtxo ||
            isLoadingRefScripts
          }
          disabled={
            isBuildingReclaimNodesTx ||
            buildReclaimNodesTxResult == null ||
            isSigningAndSubmittingTx
          }
          onClick={handleClaim}
        >
          Claim
        </Button>
      </DialogFooter>

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
