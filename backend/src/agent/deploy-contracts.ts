import {
  addRefScriptCarrier,
  buildTx,
  type Contract,
  calculateTxValidityInterval,
  constantRefScriptsByNetwork,
  ensure,
  type GeneratedContracts,
  makeBuilder,
  type RefScriptCarrierDatum,
} from '@wingriders/multi-dex-launchpad-common'
import {
  type Launch,
  type RefScriptCarrier,
  RefScriptCarrierType,
  type TxOutput,
} from '../../prisma/generated/client'
import {slotToTime} from '../common'
import {config} from '../config'
import {txOutputToRefScriptUtxo} from '../endpoints/ref-scripts'
import {logger} from '../logger'
import {getMeshBuilderBodyForLogging} from './helpers'
import {submitTx} from './ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from './providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  getWalletPubKeyHash,
  trackNewWalletUtxos,
  trackSpentInputs,
} from './wallet'

const phases = [1, 2, 3, 4, 5, 6] as const
type Phase = (typeof phases)[number]

// -----------------------------------------------------------------------------
// Pending deployment cache
// -----------------------------------------------------------------------------

const PENDING_DEPLOY_TTL = 10

// launchTxHash -> remaining TTL (in blocks)
const pendingDeploymentsTtl: Record<string, number> = {}

const tickPendingDeployments = () => {
  for (const launchTxHash of Object.keys(pendingDeploymentsTtl)) {
    pendingDeploymentsTtl[launchTxHash]! -= 1
    if (pendingDeploymentsTtl[launchTxHash]! <= 0) {
      delete pendingDeploymentsTtl[launchTxHash]
    }
  }
}

const markDeploymentPending = (launchTxHash: string) => {
  pendingDeploymentsTtl[launchTxHash] = PENDING_DEPLOY_TTL
}

const isDeploymentPending = (launchTxHash: string) =>
  pendingDeploymentsTtl[launchTxHash] != null

// Deploy contracts if needed
// We split the deployment into 5 phases so we fit into tx limits
// It's important we always do that first so we always have contracts deployed
//
// Return true if the deploy was needed
// Return false if no action was needed because everything was already deployed
export const deployContractsIfNeeded = async (
  launch: Launch & {refScriptCarriers: RefScriptCarrier[]},
  contracts: GeneratedContracts,
) => {
  // Tick TTL once per block call
  tickPendingDeployments()

  const launchTxHash = launch.txHash

  const phasesWithUndeployedContracts = phases
    .map((phase) => ({
      phase,
      contractsToDeploy: getUndeployedLaunchContracts(
        launch.refScriptCarriers,
        contracts,
        phase,
      ),
    }))
    .filter(({contractsToDeploy}) => contractsToDeploy.length > 0)

  if (phasesWithUndeployedContracts.length === 0) {
    // All contracts were already deployed
    delete pendingDeploymentsTtl[launchTxHash]
    return false
  }
  if (isDeploymentPending(launchTxHash)) {
    logger.info(
      {
        launchTxHash,
        missingPhases: phasesWithUndeployedContracts.map((p) => p.phase),
      },
      'Deployment already pending but not included in the block, skipping resubmission',
    )
    return true
  }

  const wallet = getWallet()

  for (const {phase, contractsToDeploy} of phasesWithUndeployedContracts) {
    // contractsToDeploy.length > 0 guaranteed by filter above

    const logContext = {
      launchTxHash: launch.txHash,
      phase,
      contracts: contractsToDeploy.map((c) => c.hash),
    }

    const b = makeBuilder(
      getWalletChangeAddress(),
      config.NETWORK,
      ogmiosProvider,
      offlineEvaluator,
    )

    const walletUtxos = getSpendableWalletUtxos()
    b.selectUtxosFrom(walletUtxos)
    setFetcherUtxos(walletUtxos)

    const datum: RefScriptCarrierDatum = {
      ownerPubKeyHash: getWalletPubKeyHash(),
      // Since the owner is the agent, any deadline is fine
      deadline: 0,
    }
    for (const contract of contractsToDeploy)
      addRefScriptCarrier(b, config.NETWORK, datum, contract)

    const unsignedTx = await buildTx(b)
    if (unsignedTx.isErr()) {
      logger.error(
        {
          ...logContext,
          txBuilderBody: getMeshBuilderBodyForLogging(b),
        },
        `Error when building transaction to deploy contracts: ${unsignedTx.error.message}`,
      )
      return true
    }

    trackSpentInputs(b)

    const signedTx = await wallet.signTx(unsignedTx.value)
    logger.info(
      {...logContext, signedTx},
      'Submitting deploy contracts transaction...',
    )
    const txHash = await submitTx(signedTx)
    logger.info(
      {...logContext, txHash},
      'Submitted deploy contracts transaction',
    )

    const newUtxos = b.meshTxBuilderBody.outputs.map((output, outputIndex) => ({
      input: {
        txHash,
        outputIndex,
      },
      output,
    }))

    trackNewWalletUtxos(
      newUtxos.filter(
        ({output}) => output.address === getWalletChangeAddress(),
      ),
    )
    // Proceed to the next phase
  }
  // We know that at least one Tx was submitted because missingPhases length was checked above
  markDeploymentPending(launchTxHash)
  return true
}

// Deployment is split into 5 phases so it fits into tx limits
//
// Phase 1:
// - rewards fold policy
// - node policy
// - commit fold policy
// - project tokens holder policy
//
// Phase 2:
// - commit fold validator
//
// NOTE: phases 2 and 3 can be unified probably if not using traces
//
// Phase 3:
// - final project tokens holder validator
//
// Phase 4:
// - rewards fold validator
// - first project tokens holder validator
//
// Phase 5:
// - node validator
const getUndeployedLaunchContracts = (
  deployedRefScriptCarriers: {type: RefScriptCarrierType}[],
  contracts: GeneratedContracts,
  phase: Phase,
) => {
  const isDeployed = (t: RefScriptCarrierType) =>
    deployedRefScriptCarriers.some((c) => c.type === t)

  const undeployedContracts: Contract[] = []

  if (phase === 1) {
    if (!isDeployed(RefScriptCarrierType.REWARDS_FOLD_POLICY))
      undeployedContracts.push(contracts.rewardsFoldPolicy)
    if (!isDeployed(RefScriptCarrierType.NODE_POLICY))
      undeployedContracts.push(contracts.nodePolicy)
    if (!isDeployed(RefScriptCarrierType.COMMIT_FOLD_POLICY))
      undeployedContracts.push(contracts.commitFoldPolicy)
    if (!isDeployed(RefScriptCarrierType.PROJECT_TOKENS_HOLDER_POLICY))
      undeployedContracts.push(contracts.tokensHolderPolicy)
  }

  if (phase === 2) {
    if (!isDeployed(RefScriptCarrierType.COMMIT_FOLD_VALIDATOR))
      undeployedContracts.push(contracts.commitFoldValidator)
  }

  if (phase === 3) {
    if (!isDeployed(RefScriptCarrierType.FINAL_PROJECT_TOKENS_HOLDER_VALIDATOR))
      undeployedContracts.push(contracts.tokensHolderFinalValidator)
  }

  if (phase === 4) {
    if (!isDeployed(RefScriptCarrierType.REWARDS_FOLD_VALIDATOR))
      undeployedContracts.push(contracts.rewardsFoldValidator)
  }
  if (phase === 5) {
    if (!isDeployed(RefScriptCarrierType.FIRST_PROJECT_TOKENS_HOLDER_VALIDATOR))
      undeployedContracts.push(contracts.tokensHolderFirstValidator)
  }

  if (phase === 6) {
    if (!isDeployed(RefScriptCarrierType.NODE_VALIDATOR))
      undeployedContracts.push(contracts.nodeValidator)
  }

  return undeployedContracts
}

export const undeployContracts = async (
  launchTxHash: string,
  unspentRefScriptCarriers: (RefScriptCarrier & {txOut: TxOutput})[],
) => {
  ensure(
    unspentRefScriptCarriers.every(
      (unspentRefScriptCarrier) =>
        unspentRefScriptCarrier.ownerPubKeyHash === getWalletPubKeyHash(),
    ),
    'RefScriptCarriers should be owned by the agent wallet',
  )

  const unspentRefScriptCarrierUtxos = unspentRefScriptCarriers
    .map(({txOut}) => txOut)
    .map(txOutputToRefScriptUtxo)
  logger.info(
    {launchTxHash},
    `Undeploying ${unspentRefScriptCarrierUtxos.length} RefScriptCarriers`,
  )

  const wallet = getWallet()
  const walletUtxos = getSpendableWalletUtxos()
  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )
  b.selectUtxosFrom(walletUtxos)

  const refScriptValidatorRef =
    constantRefScriptsByNetwork[config.NETWORK].refScriptCarrierValidator

  // Spend ref script carrier UTxOs
  for (const refScriptCarrierUtxo of unspentRefScriptCarrierUtxos) {
    b.spendingPlutusScriptV2()
      .txIn(
        refScriptCarrierUtxo.input.txHash,
        refScriptCarrierUtxo.input.outputIndex,
        refScriptCarrierUtxo.output.amount,
        refScriptCarrierUtxo.output.address,
        refScriptCarrierUtxo.scriptSize,
      )
      .spendingTxInReference(
        refScriptValidatorRef.input.txHash,
        refScriptValidatorRef.input.outputIndex,
        refScriptValidatorRef.scriptSize.toString(),
        refScriptValidatorRef.output.scriptHash,
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue([])
  }

  // Validity interval
  const {validityStartSlot, validityEndSlot} = calculateTxValidityInterval(
    config.NETWORK,
  )
  const validityStartTime = slotToTime(validityStartSlot)
  ensure(
    unspentRefScriptCarriers.every(
      (unspentRefScriptCarrier) =>
        unspentRefScriptCarrier.deadline < validityStartTime,
    ),
    {
      launchTxHash,
      deadlines: unspentRefScriptCarriers.map(({deadline}) => deadline),
      validityStartTime,
    },
    'RefScriptCarriers should have deadlines in the past',
  )
  b.invalidBefore(validityStartSlot).invalidHereafter(validityEndSlot)

  setFetcherUtxos([
    ...walletUtxos,
    ...unspentRefScriptCarrierUtxos,
    refScriptValidatorRef,
  ])

  // Collateral
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')

  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )

  b.requiredSignerHash(getWalletPubKeyHash())

  const unsignedTx = await buildTx(b)
  if (unsignedTx.isErr()) {
    logger.error(
      {
        launchTxHash,
        unspentRefScriptCarriers: unspentRefScriptCarrierUtxos.map(
          (utxo) => utxo.input,
        ),
        txBuilderBody: getMeshBuilderBodyForLogging(b),
      },
      `Error when building transaction to undeploy contracts: ${unsignedTx.error.message}`,
    )
    return true
  }

  trackSpentInputs(b)

  const signedTx = await wallet.signTx(unsignedTx.value)
  logger.info(
    {launchTxHash, signedTx},
    'Submitting undeploy contracts transaction...',
  )
  const txHash = await submitTx(signedTx)
  logger.info(
    {launchTxHash, txHash},
    'Submitted undeploy contracts transaction',
  )
  return txHash
}
