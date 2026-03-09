import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  type AddClaimRewardsArgs,
  addClaimRewards,
  calculateTxValidityInterval,
  constantRefScriptsByNetwork,
  type LaunchConfig,
  LOVELACE_UNIT,
} from '@wingriders/multi-dex-launchpad-common'
import {RefreshCcwIcon} from 'lucide-react'
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
import type {RewardsHolder} from './types'

type ClaimRewardsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  launchTxHash: string
  config: Pick<LaunchConfig, 'projectToken'>
  unspentRewardsHolders: RewardsHolder[]
  connectedWallet: ConnectedWallet
}

export const ClaimRewardsDialog = ({
  open,
  onOpenChange,
  launchTxHash,
  config,
  unspentRewardsHolders,
  connectedWallet,
}: ClaimRewardsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ClaimRewardsDialogContent
          onOpenChange={onOpenChange}
          launchTxHash={launchTxHash}
          config={config}
          unspentRewardsHolders={unspentRewardsHolders}
          connectedWallet={connectedWallet}
        />
      </DialogContent>
    </Dialog>
  )
}

type ClaimRewardsDialogContentProps = {
  onOpenChange: (open: boolean) => void
  launchTxHash: string
  config: Pick<LaunchConfig, 'projectToken'>
  unspentRewardsHolders: RewardsHolder[]
  connectedWallet: ConnectedWallet
}

const ClaimRewardsDialogContent = ({
  onOpenChange,
  launchTxHash,
  config,
  unspentRewardsHolders,
  connectedWallet,
}: ClaimRewardsDialogContentProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const network = env('NEXT_PUBLIC_NETWORK')

  const {time} = useTime(10_000)

  const rewardsToClaim = useMemo(
    () => unspentRewardsHolders.reduce((acc, h) => acc + h.rewards, 0n),
    [unspentRewardsHolders],
  )

  const {
    data: poolProofUtxo,
    isLoading: isLoadingPoolProofUtxo,
    error: poolProofUtxoError,
    refetch: refetchPoolProofUtxo,
  } = useQuery(
    trpc.poolProofUtxo.queryOptions({
      launchTxHash,
    }),
  )

  const {
    data: rewardsHolderUtxos,
    isLoading: isLoadingRewardsHolderUtxos,
    error: rewardsHolderUtxosError,
  } = useQuery(
    trpc.utxos.queryOptions(
      unspentRewardsHolders.map((h) => ({
        txHash: h.txHash,
        outputIndex: h.outputIndex,
      })),
    ),
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

  const buildArgs: AddClaimRewardsArgs | undefined =
    poolProofUtxo != null &&
    rewardsHolderUtxos != null &&
    rewardsHolderUtxos.length === unspentRewardsHolders.length
      ? {
          poolProofInput: poolProofUtxo.input,
          rewardsHolderUtxos,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
          lowerTimeLimitSlot: validityInterval.validityStartSlot,
          upperTimeLimitSlot: validityInterval.validityEndSlot,
        }
      : undefined

  const {
    data: buildClaimRewardsTxResult,
    isFetching: isBuildingClaimRewardsTx,
    error: buildClaimRewardsTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildClaimRewardsTx(buildArgs),
    queryFn:
      buildArgs != null &&
      walletCollateralUtxo != null &&
      walletUtxos != null &&
      connectedWallet != null &&
      poolProofUtxo != null &&
      rewardsHolderUtxos != null
        ? async () => {
            const txBuilder = await initTxBuilder({
              wallet: connectedWallet.wallet,
              network,
              walletUtxos,
              collateralUtxo: walletCollateralUtxo,
              changeAddress: connectedWallet.address,
              additionalFetcherUtxos: [
                poolProofUtxo,
                constantRefScriptsByNetwork[network].rewardsHolderValidator,
                ...rewardsHolderUtxos,
              ],
            })

            addClaimRewards(txBuilder, buildArgs)

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
  }, [buildClaimRewardsTxResult, resetSignAndSubmitTx])

  const handleClaim = async () => {
    if (buildClaimRewardsTxResult == null) return

    const res = await signAndSubmitTx(buildClaimRewardsTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)

      queryClient.setQueryData(
        trpc.userRewardsHolders.queryKey({
          launchTxHash,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
        }),
        (current) =>
          current?.map((h) => ({
            ...h,
            isSpent: true,
          })),
      )
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Claim launch rewards</DialogTitle>
      </DialogHeader>

      <div>
        <GridItem
          label="Rewards"
          value={
            <AssetQuantity
              unit={config.projectToken}
              quantity={rewardsToClaim}
            />
          }
          direction="horizontal"
          className="justify-between"
        />

        {buildClaimRewardsTxResult && (
          <div className="mt-4 space-y-1">
            <GridItem
              label="Transaction fee"
              value={
                <AssetQuantity
                  unit={LOVELACE_UNIT}
                  quantity={buildClaimRewardsTxResult.fee}
                />
              }
              direction="horizontal"
              className="justify-between"
            />
          </div>
        )}

        <div className="mt-4 space-y-2">
          {buildClaimRewardsTxError && (
            <ErrorAlert
              title="Error while building transaction"
              description={buildClaimRewardsTxError.message}
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

          {poolProofUtxoError && (
            <ErrorAlert
              title="Error while fetching pool proof"
              description={poolProofUtxoError.message}
            />
          )}
          {!poolProofUtxo && !poolProofUtxoError && (
            <div className="flex flex-row items-center gap-2">
              <ErrorAlert title="Pool proof was not created yet, wait for the agent to create it" />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => refetchPoolProofUtxo()}
              >
                <RefreshCcwIcon />
              </Button>
            </div>
          )}
          {rewardsHolderUtxosError && (
            <ErrorAlert
              title="Error while fetching rewards holders UTxOs"
              description={rewardsHolderUtxosError.message}
            />
          )}
          {!rewardsHolderUtxosError &&
            rewardsHolderUtxos &&
            rewardsHolderUtxos.length !== unspentRewardsHolders.length && (
              <ErrorAlert title="Not all rewards holders UTxOs were found" />
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
          loading={
            isLoadingPoolProofUtxo ||
            isLoadingRewardsHolderUtxos ||
            isBuildingClaimRewardsTx ||
            isSigningAndSubmittingTx ||
            isLoadingWalletUtxos ||
            isLoadingWalletCollateralUtxo
          }
          disabled={
            isBuildingClaimRewardsTx ||
            buildClaimRewardsTxResult == null ||
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
