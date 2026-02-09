'use client'

import {
  SLOT_CONFIG_NETWORK,
  slotToBeginUnixTime,
  type Unit,
} from '@meshsdk/core'
import {skipToken, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  type AddCreateCommitmentArgs,
  addCreateCommitment,
  calculateTxValidityIntervalForInsertNode,
  type LaunchConfig,
  LOVELACE_UNIT,
  parseUnit,
  type Tier,
} from '@wingriders/multi-dex-launchpad-common'

import {isAfter} from 'date-fns'
import {AlertTriangleIcon} from 'lucide-react'
import {useEffect, useMemo, useState} from 'react'
import {useDebounce} from 'use-debounce'
import {useShallow} from 'zustand/shallow'
import {AssetInput} from '@/components/asset-input/asset-input'
import {UnitSelect} from '@/components/asset-input/unit-select'
import {AssetQuantity} from '@/components/asset-quantity'
import {ErrorAlert} from '@/components/error-alert'
import {GridItem} from '@/components/grid-item'
import {InfoTooltip} from '@/components/info-tooltip'
import {TxSubmittedDialog} from '@/components/tx-submitted-dialog'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {env} from '@/config'
import {getAssetQuantityFormatter} from '@/helpers/format-asset-quantity'
import {queryKeyFactory} from '@/helpers/query-key'
import {useUpdatedTime} from '@/helpers/time'
import {getTxFee, initTxBuilder} from '@/helpers/tx'
import {useTokenMetadata} from '@/metadata/queries'
import {useConnectedWalletStore} from '@/store/connected-wallet'
import {useTRPC} from '@/trpc/client'
import {getTxSendErrorMessage, getTxSignErrorMessage} from '@/wallet/errors'
import {
  invalidateWalletQueries,
  useSignAndSubmitTxMutation,
  useWalletBalanceQuery,
  useWalletCollateralUtxoQuery,
  useWalletUtxosQuery,
} from '@/wallet/queries'
import {useNodeRefScripts} from './helpers'

type ContributingLaunchConfig = Pick<
  LaunchConfig,
  | 'defaultStartTime'
  | 'endTime'
  | 'nodeAda'
  | 'presaleTierCs'
  | 'presaleTierStartTime'
  | 'raisingToken'
  | 'defaultTierMinCommitment'
  | 'presaleTierMinCommitment'
  | 'defaultTierMaxCommitment'
  | 'presaleTierMaxCommitment'
>

type ContributingProps = {
  launchTxHash: string
  config: ContributingLaunchConfig
}

const DEBOUNCE_DELAY = 100

export const Contributing = ({launchTxHash, config}: ContributingProps) => {
  const time = useUpdatedTime(useMemo(() => [config.endTime], [config.endTime]))

  const isPast = isAfter(time, config.endTime)

  if (isPast)
    return <div className="text-muted-foreground">Contribution has ended</div>

  return <ActiveContributing launchTxHash={launchTxHash} config={config} />
}

type ActiveContributingProps = {
  launchTxHash: string
  config: ContributingLaunchConfig
}

const ActiveContributing = ({
  launchTxHash,
  config,
}: ActiveContributingProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const {metadata: raisingTokenMetadata} = useTokenMetadata(config.raisingToken)
  const formatRaisingTokenQuantity =
    getAssetQuantityFormatter(raisingTokenMetadata)

  const network = env('NEXT_PUBLIC_NETWORK')

  const time = useUpdatedTime(
    useMemo(
      () => [
        config.defaultStartTime,
        config.presaleTierStartTime,
        config.endTime,
      ],
      [config.defaultStartTime, config.presaleTierStartTime, config.endTime],
    ),
    10_000,
  )

  const {
    connectedWallet,
    isWalletConnecting,
    isHydrated: isWalletStoreHydrated,
  } = useConnectedWalletStore(
    useShallow(({connectedWallet, isWalletConnecting, isHydrated}) => ({
      connectedWallet,
      isWalletConnecting,
      isHydrated,
    })),
  )

  const [committed, setCommitted] = useState<bigint | null>(null)
  const [selectedTierUnit, setSelectedTierUnit] = useState<Unit | null>(null)

  const [debouncedCommitted] = useDebounce(committed, DEBOUNCE_DELAY)

  const {
    data: nodeToSpend,
    isLoading: isLoadingNodeToSpend,
    error: nodeToSpendError,
  } = useQuery(
    trpc.nodeToSpend.queryOptions(
      connectedWallet
        ? {launchTxHash, ownerPubKeyHash: connectedWallet.pubKeyHash}
        : skipToken,
    ),
  )

  const {
    data: firstProjectTokensHolderUTxO,
    isLoading: isLoadingFirstProjectTokensHolderUTxO,
    error: firstProjectTokensHolderUTxOError,
  } = useQuery(trpc.firstProjectTokensHolderUTxO.queryOptions({launchTxHash}))

  const {
    nodeValidatorRef,
    nodePolicyRef,
    isLoading: isLoadingRefScripts,
    isError: isRefScriptsError,
    uniqueErrorMessages: refScriptsUniqueErrorMessages,
  } = useNodeRefScripts(launchTxHash)

  const {
    data: walletUtxos,
    isLoading: isLoadingWalletUtxos,
    error: walletUtxosError,
  } = useWalletUtxosQuery()

  const {
    data: walletBalance,
    isLoading: isLoadingWalletBalance,
    balanceState: walletBalanceState,
    error: walletBalanceError,
  } = useWalletBalanceQuery()

  const {
    data: walletCollateralUtxo,
    isLoading: isLoadingWalletCollateralUtxo,
    error: walletCollateralUtxoError,
  } = useWalletCollateralUtxoQuery({
    walletUtxos,
    isLoadingWalletUtxos,
  })

  const hasSufficientBalance =
    walletBalance != null && committed != null
      ? (walletBalance[config.raisingToken] ?? 0n) >= committed + config.nodeAda
      : undefined

  const hasPresaleTier = config.presaleTierStartTime < config.endTime

  const availableUnitsForPresaleTier = useMemo(() => {
    if (!walletUtxos || !hasPresaleTier) return undefined

    return walletUtxos.flatMap((utxo) =>
      utxo.output.amount
        .map(({unit}) => unit)
        .filter((unit) => {
          const [policyId] = parseUnit(unit)
          return policyId === config.presaleTierCs
        }),
    )
  }, [walletUtxos, config.presaleTierCs, hasPresaleTier])

  const hasPresaleTierAndCanParticipate =
    hasPresaleTier &&
    availableUnitsForPresaleTier != null &&
    availableUnitsForPresaleTier.length > 0

  const currentlyActiveTier: Tier | 'upcoming' = (() => {
    if (time > config.defaultStartTime) return 'default'
    if (time > config.presaleTierStartTime) return 'presale'
    return 'upcoming'
  })()

  const buildingTxForTier: Tier = (() => {
    if (currentlyActiveTier === 'default') return 'default'
    return hasPresaleTierAndCanParticipate ? 'presale' : 'default'
  })()

  const hasActiveOrUpcomingPresaleTier =
    currentlyActiveTier === 'presale' ||
    (currentlyActiveTier === 'upcoming' && hasPresaleTier)

  const [
    selectedTierMinCommitment,
    selectedTierMaxCommitment,
    selectedTierStartTime,
  ] = {
    default: [
      config.defaultTierMinCommitment,
      config.defaultTierMaxCommitment,
      config.defaultStartTime,
    ] as const,
    presale: [
      config.presaleTierMinCommitment,
      config.presaleTierMaxCommitment,
      config.presaleTierStartTime,
    ] as const,
  }[buildingTxForTier]

  useEffect(() => {
    setSelectedTierUnit(availableUnitsForPresaleTier?.[0] ?? null)
  }, [availableUnitsForPresaleTier])

  const validityInterval = calculateTxValidityIntervalForInsertNode(
    network,
    selectedTierStartTime,
    config.endTime,
    time,
  )

  const buildArgs: AddCreateCommitmentArgs | undefined =
    debouncedCommitted != null &&
    debouncedCommitted >= selectedTierMinCommitment &&
    debouncedCommitted <= selectedTierMaxCommitment &&
    nodeToSpend != null &&
    nodeValidatorRef != null &&
    nodePolicyRef != null &&
    firstProjectTokensHolderUTxO != null &&
    connectedWallet != null &&
    (buildingTxForTier === 'default' ||
      (buildingTxForTier === 'presale' && selectedTierUnit != null))
      ? {
          config,
          committed: debouncedCommitted,
          lowerTimeLimitSlot: validityInterval.validityStartSlot,
          upperTimeLimitSlot: validityInterval.validityEndSlot,
          tier:
            buildingTxForTier === 'default'
              ? {type: 'default'}
              : {type: 'presale', unit: selectedTierUnit!},
          nodeToSpend,
          nodeValidatorRef,
          nodePolicyRef,
          firstProjectTokensHolderUTxO,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
        }
      : undefined

  const {
    data: buildCreateCommitmentTxResult,
    isFetching: isBuildingCreateCommitmentTx,
    error: buildCreateCommitmentTxError,
  } = useQuery({
    queryKey: queryKeyFactory.buildCreateCommitmentTx(
      launchTxHash,
      committed,
      nodeToSpend?.input,
    ),
    queryFn:
      buildArgs != null &&
      walletCollateralUtxo != null &&
      walletUtxos != null &&
      connectedWallet != null &&
      nodeValidatorRef != null &&
      nodePolicyRef != null &&
      firstProjectTokensHolderUTxO != null &&
      hasSufficientBalance &&
      nodeToSpend != null
        ? async () => {
            const txBuilder = await initTxBuilder({
              wallet: connectedWallet.wallet,
              network,
              walletUtxos,
              collateralUtxo: walletCollateralUtxo,
              changeAddress: connectedWallet.address,
              additionalFetcherUtxos: [
                nodeToSpend,
                nodeValidatorRef,
                nodePolicyRef,
                firstProjectTokensHolderUTxO,
              ],
            })

            addCreateCommitment(txBuilder, buildArgs)

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
  }, [buildCreateCommitmentTxResult, resetSignAndSubmitTx])

  const handleContribute = async () => {
    if (
      buildCreateCommitmentTxResult == null ||
      connectedWallet == null ||
      debouncedCommitted == null
    )
      return

    const res = await signAndSubmitTx(buildCreateCommitmentTxResult.tx)
    if (res) {
      invalidateWalletQueries(queryClient)

      queryClient.setQueryData(
        trpc.userNodes.queryKey({
          launchTxHash,
          ownerPubKeyHash: connectedWallet.pubKeyHash,
        }),
        (current) => [
          ...(current ?? []),
          {
            txHash: res.txHash,
            outputIndex: 0, // new node is always the first output
            keyHash: connectedWallet.pubKeyHash,
            keyIndex: current?.length ?? 0,
            committed: debouncedCommitted,
            createdTime: new Date(
              slotToBeginUnixTime(
                validityInterval.validityEndSlot,
                SLOT_CONFIG_NETWORK[network],
              ),
            ),
          },
        ],
      )
    }
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="font-bold text-2xl">Contribute</h2>

        {buildingTxForTier === 'presale' &&
          availableUnitsForPresaleTier != null && (
            <div className="flex flex-row items-center justify-between gap-2 rounded-md bg-gray-800 p-3 pl-7">
              <div className="flex flex-row items-center gap-3">
                <p className="text-sm">Presale token</p>
                <InfoTooltip content="One unit of this token will be locked with your contribution in order to participate in the presale. You will be able to redeem it when claiming your received tokens after the launch ends." />
              </div>

              <UnitSelect
                items={availableUnitsForPresaleTier.map((unit) => ({
                  unit,
                  balance: walletBalance?.[unit] ?? 0n,
                }))}
                value={selectedTierUnit}
                onChange={setSelectedTierUnit}
                balanceState={walletBalanceState}
              />
            </div>
          )}

        {connectedWallet != null &&
          isWalletStoreHydrated &&
          !isWalletConnecting &&
          !isLoadingWalletUtxos &&
          hasActiveOrUpcomingPresaleTier &&
          buildingTxForTier === 'default' && (
            <Alert>
              <AlertTriangleIcon className="size-4 shrink-0" />
              <AlertTitle>
                You are not eligible to contribute in the presale
              </AlertTitle>
              <AlertDescription>
                In order to be able to contribute in the presale, you must hold
                a token with the selected policy ID for the presale. You can
                still build a transaction to contribute to the public sale.
              </AlertDescription>
            </Alert>
          )}

        <AssetInput
          items={[
            {
              unit: config.raisingToken,
              balance: walletBalance?.[config.raisingToken] ?? 0n,
            },
          ]}
          value={{unit: config.raisingToken, quantity: committed}}
          onChange={({quantity}) => setCommitted(quantity)}
          balanceState={walletBalanceState}
          singleItem
          showMaxButton
          disabled={isSigningAndSubmittingTx}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleContribute}
                disabled={
                  committed == null ||
                  committed < selectedTierMinCommitment ||
                  committed > selectedTierMaxCommitment ||
                  buildCreateCommitmentTxResult == null ||
                  isBuildingCreateCommitmentTx ||
                  isSigningAndSubmittingTx
                }
                loading={
                  isBuildingCreateCommitmentTx ||
                  isSigningAndSubmittingTx ||
                  isWalletConnecting ||
                  isLoadingFirstProjectTokensHolderUTxO ||
                  isLoadingRefScripts ||
                  isLoadingNodeToSpend ||
                  isLoadingWalletUtxos ||
                  isLoadingWalletBalance ||
                  isLoadingWalletCollateralUtxo
                }
              >
                Contribute
              </Button>
            </div>
          </TooltipTrigger>
          {(committed == null ||
            committed === 0n ||
            connectedWallet == null) && (
            <TooltipContent>
              {connectedWallet == null
                ? 'Connect your wallet to contribute'
                : 'Enter the amount of tokens you want to contribute'}
            </TooltipContent>
          )}
        </Tooltip>

        {buildCreateCommitmentTxResult && (
          <div className="space-y-1">
            <GridItem
              label="Transaction fee"
              value={
                <AssetQuantity
                  unit={LOVELACE_UNIT}
                  quantity={buildCreateCommitmentTxResult.fee}
                />
              }
              direction="horizontal"
              className="justify-between"
            />
            <GridItem
              label="Oil"
              value={
                <AssetQuantity unit={LOVELACE_UNIT} quantity={config.nodeAda} />
              }
              direction="horizontal"
              className="justify-between"
              tooltip="Additional ADA that is required in your commitment UTxO. You can reclaim part of it when claiming your received tokens after the launch ends."
            />
          </div>
        )}

        {connectedWallet != null && (
          <div className="space-y-2">
            {buildCreateCommitmentTxError && (
              <ErrorAlert
                title="Error while building transaction"
                description={buildCreateCommitmentTxError.message}
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
                description={getTxSendErrorMessage(
                  submitTxMutationResult.error,
                )}
              />
            )}

            {committed != null && committed !== 0n && (
              <>
                {nodeToSpendError && (
                  <ErrorAlert
                    title="Error while fetching previous node in the linked list"
                    description={nodeToSpendError.message}
                  />
                )}
                {firstProjectTokensHolderUTxOError && (
                  <ErrorAlert
                    title="Error while fetching first project tokens holder UTxO"
                    description={firstProjectTokensHolderUTxOError.message}
                  />
                )}
                {isRefScriptsError && (
                  <ErrorAlert
                    title="Error while fetching reference scripts"
                    description={refScriptsUniqueErrorMessages.join('. ')}
                  />
                )}
              </>
            )}

            {walletUtxosError && (
              <ErrorAlert
                title="Error while fetching wallet UTxOs"
                description={walletUtxosError.message}
              />
            )}
            {walletBalanceError && (
              <ErrorAlert
                title="Error while fetching wallet balance"
                description={walletBalanceError.message}
              />
            )}
            {hasSufficientBalance === false && (
              <ErrorAlert title="Insufficient balance" />
            )}
            {committed != null &&
              committed !== 0n &&
              committed < selectedTierMinCommitment && (
                <ErrorAlert
                  title="Insufficient contribution"
                  description={`You need to contribute at least ${formatRaisingTokenQuantity(selectedTierMinCommitment)}`}
                />
              )}
            {committed != null && committed > selectedTierMaxCommitment && (
              <ErrorAlert
                title="Excessive contribution"
                description={`You can contribute at most ${formatRaisingTokenQuantity(selectedTierMaxCommitment)}`}
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
        )}
      </div>

      <TxSubmittedDialog
        txHash={submitTxMutationResult.data}
        onOpenChange={() => {
          resetSignAndSubmitTx()
          setCommitted(null)
        }}
      />
    </>
  )
}
