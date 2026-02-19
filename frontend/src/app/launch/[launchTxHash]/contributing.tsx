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
  DEFAULT_TX_VALIDITY_START_BACKDATE_MS,
  type LaunchConfig,
  LOVELACE_UNIT,
  parseUnit,
  type Tier,
} from '@wingriders/multi-dex-launchpad-common'

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
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {env} from '@/config'
import {formatDateTime} from '@/helpers/format'
import {getAssetQuantityFormatter} from '@/helpers/format-asset-quantity'
import {bigIntMax} from '@/helpers/number'
import {queryKeyFactory} from '@/helpers/query-key'
import {shortLabel} from '@/helpers/short-label'
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
  | 'projectMaxCommitment'
>

type ContributingProps = {
  launchTxHash: string
  config: ContributingLaunchConfig
  totalCommitted: bigint
  isCancelled: boolean
}

const DEBOUNCE_DELAY = 100

export const Contributing = ({
  launchTxHash,
  config,
  totalCommitted,
  isCancelled,
}: ContributingProps) => {
  const time = useUpdatedTime(useMemo(() => [config.endTime], [config.endTime]))

  const isPast = time >= config.endTime

  if (isPast || isCancelled)
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-2xl">Contribute</h2>
        <div className="text-muted-foreground">
          {isCancelled ? 'Launch was cancelled' : 'Contribution has ended'}
        </div>
      </div>
    )

  return (
    <ActiveContributing
      launchTxHash={launchTxHash}
      config={config}
      totalCommitted={totalCommitted}
    />
  )
}

type ActiveContributingProps = {
  launchTxHash: string
  config: ContributingLaunchConfig
  totalCommitted: bigint
}

const ActiveContributing = ({
  launchTxHash,
  config,
  totalCommitted,
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

  const {connectedWallet, isWalletConnecting} = useConnectedWalletStore(
    useShallow(({connectedWallet, isWalletConnecting}) => ({
      connectedWallet,
      isWalletConnecting,
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

  const hasDefaultTier = config.defaultStartTime < config.endTime
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
    return hasPresaleTierAndCanParticipate || !hasDefaultTier
      ? 'presale'
      : 'default'
  })()

  const [
    selectedTierMinCommitment,
    selectedTierMaxCommitment,
    selectedTierStartTime,
    selectedTierName,
  ] = {
    default: [
      config.defaultTierMinCommitment,
      config.defaultTierMaxCommitment,
      config.defaultStartTime,
      'public',
    ] as const,
    presale: [
      config.presaleTierMinCommitment,
      config.presaleTierMaxCommitment,
      config.presaleTierStartTime,
      'presale',
    ] as const,
  }[buildingTxForTier]

  const cannotParticipateAtAll =
    buildingTxForTier === 'presale' &&
    (availableUnitsForPresaleTier == null ||
      availableUnitsForPresaleTier.length === 0)

  useEffect(() => {
    setSelectedTierUnit(availableUnitsForPresaleTier?.[0] ?? null)
  }, [availableUnitsForPresaleTier])

  const validityInterval = calculateTxValidityIntervalForInsertNode(
    network,
    selectedTierStartTime,
    config.endTime,
    time,
  )

  const isBuildingTxTooSoon =
    slotToBeginUnixTime(
      validityInterval.validityStartSlot,
      SLOT_CONFIG_NETWORK[network],
    ) >
    time - DEFAULT_TX_VALIDITY_START_BACKDATE_MS

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
          firstProjectTokensHolderInput: firstProjectTokensHolderUTxO.input,
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
      debouncedCommitted,
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

    const res = await signAndSubmitTx(buildCreateCommitmentTxResult.tx, true)
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
            overCommitted: bigIntMax(
              debouncedCommitted -
                bigIntMax(config.projectMaxCommitment - totalCommitted, 0n),
              0n,
            ),
            createdTime: new Date(
              slotToBeginUnixTime(
                validityInterval.validityEndSlot,
                SLOT_CONFIG_NETWORK[network],
              ),
            ),
            isSpent: false,
            presaleTierUnit:
              buildingTxForTier === 'presale'
                ? (selectedTierUnit ?? undefined)
                : undefined,
          },
        ],
      )

      queryClient.setQueryData(
        trpc.launch.queryKey({txHash: launchTxHash}),
        (current) => {
          if (current == null) return undefined

          return {
            ...current,
            totalCommitted: current.totalCommitted + debouncedCommitted,
          }
        },
      )
    }
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="font-bold text-2xl">Contribute</h2>

        {buildingTxForTier === 'presale' &&
          availableUnitsForPresaleTier != null && (
            <div className="space-y-2 rounded-md bg-gray-800 p-7 pr-3">
              <p className="whitespace-pre-line text-muted-foreground text-sm">
                In order to participate in the presale, you must hold a token
                with policy ID:{' '}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="break-all font-mono">
                      {shortLabel(config.presaleTierCs, 10, 10)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{config.presaleTierCs}</TooltipContent>
                </Tooltip>
                .
              </p>

              <div className="flex flex-row items-center justify-between gap-2">
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
            </div>
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
            connectedWallet == null ||
            cannotParticipateAtAll) && (
            <TooltipContent>
              {connectedWallet == null
                ? 'Connect your wallet to contribute'
                : cannotParticipateAtAll
                  ? 'No token with the required policy ID found in your wallet'
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
            {isBuildingTxTooSoon && (
              <Alert className="mt-4" variant="warning">
                <AlertTriangleIcon className="size-4 shrink-0" />

                <AlertDescription>
                  <p className="whitespace-pre-line">
                    You are pre-building contribution for the{' '}
                    <strong>{selectedTierName}</strong> tier which starts at{' '}
                    <strong>{formatDateTime(selectedTierStartTime)}</strong>.
                    {'\n\n'}
                    Your transaction will be most likely rejected because your
                    wallet might not have the information about the latest block
                    created after the tier start time. If the submission fails,
                    try submitting it again.
                  </p>
                </AlertDescription>
              </Alert>
            )}
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
