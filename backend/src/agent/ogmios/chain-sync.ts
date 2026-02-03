import {createChainSynchronizationClient} from '@cardano-ogmios/client'
import type {
  BlockPraos,
  MetadatumDetailedSchema,
  Point,
  Transaction,
  TransactionOutput,
  TransactionOutputReference,
  Value,
} from '@cardano-ogmios/schema'
import {
  applyCborEncoding,
  parseAssetUnit,
  resolveScriptHash,
} from '@meshsdk/core'
import type {JsonValue} from '@prisma/client/runtime/client'
import {
  createUnit,
  DAO_ADMIN_PUB_KEY_HASH,
  DAO_FEE_RECEIVER_BECH32_ADDRESS,
  decodeDatum,
  ensure,
  failProofDatumCborSchema,
  type GeneratedValidator,
  generateLaunchpadContracts,
  getLaunchTxMetadataSchema,
  INIT_LAUNCH_AGENT_LOVELACE,
  INIT_LAUNCH_TX_METADATA_LABEL,
  poolProofDatumCborSchema,
  sundaePoolDatumCborSchema,
  tryDeserializeAddress,
  wrPoolDatumCborSchema,
} from '@wingriders/multi-dex-launchpad-common'
import z from 'zod'
import type {Block, TxOutput} from '../../../prisma/generated/client'
import type {
  LaunchCreateManyInput,
  TxOutputCreateManyInput,
} from '../../../prisma/generated/models'
import {config} from '../../config'
import {prisma} from '../../db/prisma-client'
import {
  ogmiosPlutusVersionToMeshVersion,
  originPoint,
  parseOgmiosMetadatum,
  serializeValue,
} from '../../helpers'
import {
  interestingLaunchByUnits,
  launchValidatorHashes,
  resetInterestingLaunches,
  trackInterestingLaunch,
} from '../../interesting-launches'
import {logger} from '../../logger'
import {CONSTANT_CONTRACTS} from '../constants'
import {getWalletChangeAddress, getWalletPubKeyHash} from '../wallet'
import {getOgmiosContext} from './ogmios'

// Buffering is suitable when doing the initial sync
const BUFFER_SIZE = 10_000

type LaunchUtxoType =
  | 'nodeValidatorRefScriptCarrier'
  | 'nodePolicyRefScriptCarrier'
  | 'firstProjectTokensHolderValidatorRefScriptCarrier'
  | 'projectTokensHolderPolicyRefScriptCarrier'
  | 'finalProjectTokensHolderValidatorRefScriptCarrier'
  | 'commitFoldValidatorRefScriptCarrier'
  | 'commitFoldPolicyRefScriptCarrier'
  | 'rewardsFoldValidatorRefScriptCarrier'
  | 'rewardsFoldPolicyRefScriptCarrier'
  | 'node'
  | 'rewardsHolder'
  | 'firstProjectTokensHolder'
  | 'finalProjectTokensHolder'
  | 'commitFold'
  | 'rewardsFold'
  | 'failProof'
  | 'wrPoolProof'
  | 'sundaePoolProof'
  | 'wrPool'
  | 'sundaePool'

// NOTE: TxOutputCreateManyInput fields must be named txOutput
//       TxOutputCreateManyInput[] fields must be named txOutputs
//       see `pushSyncEvent` for details
type SyncEvent =
  | {
      type: 'block'
      data: Block
    }
  | {
      type: 'agentTxOutput'
      txOutput: TxOutputCreateManyInput
    }
  | {
      type: 'launchTxOutput'
      launchTxHash: string
      txOutput: TxOutputCreateManyInput
      outputType: LaunchUtxoType
    }
  | {
      type: 'spentTxOutput'
      data: {
        spentSlot: number
        spent: {
          utxos: TransactionOutputReference[]
          spentTxHash: string
        }[]
      }
    }
  | {
      type: 'initLaunch'
      launch: LaunchCreateManyInput
    }

export let syncEventBuffer: SyncEvent[] = []

// TODO: we might want to switch to a set/map?
let trackedUtxos: TxOutput[] = []
// Scans all tracked utxos in O(n) and returns true if the utxo is tracked
const isUtxoTracked = (utxo: TransactionOutputReference): boolean => {
  for (const trackedUtxo of trackedUtxos)
    if (
      trackedUtxo.txHash === utxo.transaction.id &&
      trackedUtxo.outputIndex === utxo.index
    )
      return true

  return false
}

// Scans all tracked utxos in O(n) and returns the utxos associated with the given address
export const getAddressTrackedUtxos = (bech32Address: string): TxOutput[] =>
  trackedUtxos.filter((utxo) => utxo.address === bech32Address)

// Pushes to the sync event buffer, tracks utxos
// Does NOT track the interesting launches
const pushSyncEvent = (event: SyncEvent) => {
  syncEventBuffer.push(event)
  const newTrackedTxOutputs: TxOutputCreateManyInput[] = []
  if ('txOutput' in event) newTrackedTxOutputs.push(event.txOutput)
  trackedUtxos.push(
    ...newTrackedTxOutputs.map((utxo) => ({
      txHash: utxo.txHash,
      slot: utxo.slot,
      outputIndex: utxo.outputIndex,
      address: utxo.address,
      datum: utxo.datum || null,
      datumHash: utxo.datumHash || null,
      value: utxo.value as JsonValue,
      spentTxHash: null,
      spentSlot: null,
    })),
  )
}

// Reset the tracked utxos cache.
// Must be called after the buffers are emptied (or at the start of the sync).
const resetTrackedUtxos = async () => {
  ensure(
    syncEventBuffer.length === 0,
    {syncEventBuffer},
    'Sync event buffer must be empty to reset the tracked utxos cache',
  )
  trackedUtxos = await prisma.txOutput.findMany({
    where: {spentSlot: null},
  })
  logger.debug({trackedUtxos}, 'Reset tracked utxos')
}

// Aggregation logic is here
const processBlock = async (block: BlockPraos) => {
  pushSyncEvent({
    type: 'block',
    data: {
      slot: block.slot,
      hash: block.id,
      height: block.height,
    },
  })

  // The order is important: we want to parse launch initializations as soon as possible
  // otherwise we might miss transactions;
  // we also want to parse spent tx outputs last as not to miss anything
  await parseInitLaunch(block.slot, block.transactions || [])
  parseTrackableTxOutputs(block.slot, block.transactions || [])
  parseSpentTxOutputs(block.slot, block.transactions || [])
}

// Pushes sync events
const parseSpentTxOutputs = (slot: number, transactions: Transaction[]) => {
  const spent: {
    utxos: TransactionOutputReference[]
    spentTxHash: string
  }[] = []
  for (const tx of transactions) {
    const spentTrackedUtxos = tx.inputs.filter(isUtxoTracked)
    if (spentTrackedUtxos.length > 0) {
      spent.push({utxos: spentTrackedUtxos, spentTxHash: tx.id})
      trackedUtxos = trackedUtxos.filter(
        (utxo) =>
          !spentTrackedUtxos.some(
            (spentUtxo) =>
              spentUtxo.transaction.id === utxo.txHash &&
              spentUtxo.index === utxo.outputIndex,
          ),
      )
    }
  }
  if (spent.length > 0)
    pushSyncEvent({
      type: 'spentTxOutput',
      data: {spentSlot: slot, spent},
    })
}

const refScriptCarrierUtxoTypeFromValidatorHashType = (
  refScriptType: GeneratedValidator,
): LaunchUtxoType | null => {
  switch (refScriptType) {
    case 'node':
      return 'nodeValidatorRefScriptCarrier'
    // NOTE: we do not deploy nor track the rewards holder validator ref script carrier
    //       it's on the users to supply the script in the tx for now
    // TODO: make it into a constant validator
    case 'rewardsHolder':
      return null
    case 'firstProjectTokensHolder':
      return 'firstProjectTokensHolderValidatorRefScriptCarrier'
    case 'finalProjectTokensHolder':
      return 'finalProjectTokensHolderValidatorRefScriptCarrier'
    case 'commitFold':
      return 'commitFoldValidatorRefScriptCarrier'
    case 'rewardsFold':
      return 'rewardsFoldValidatorRefScriptCarrier'
    default:
      ensure(false, {refScriptType}, 'Unknown ref script type')
  }
}

const passesValidityToken = (
  {contracts, type}: (typeof launchValidatorHashes)[string],
  value: Value,
): boolean => {
  // These contracts don't require a validity token
  if (
    type === 'refScriptCarrier' ||
    type === 'rewardsHolder' ||
    type === 'finalProjectTokensHolder'
  )
    return true

  switch (type) {
    case 'node':
      return (
        value[contracts.nodePolicy.hash]?.[contracts.nodeValidator.hash] === 1n
      )
    case 'firstProjectTokensHolder':
      return (
        value[contracts.tokensHolderPolicy.hash]?.[
          contracts.tokensHolderFirstValidator.hash
        ] === 1n
      )
    case 'commitFold':
      return (
        value[contracts.commitFoldPolicy.hash]?.[
          contracts.commitFoldValidator.hash
        ] === 1n
      )
    case 'rewardsFold':
      return (
        value[contracts.rewardsFoldPolicy.hash]?.[
          contracts.rewardsFoldValidator.hash
        ] === 1n
      )
    case 'failProof':
      return (
        value[CONSTANT_CONTRACTS.failProofPolicy.hash]?.[
          CONSTANT_CONTRACTS.failProofValidator.hash
        ] === 1n
      )
    case 'poolProof':
      return (
        value[CONSTANT_CONTRACTS.poolProofPolicy.hash]?.[
          CONSTANT_CONTRACTS.poolProofValidator.hash
        ] === 1n
      )
    case 'wrPool':
      // TODO: wr token
      return true
    case 'sundaePool':
      // TODO: sundae token
      return true
    default:
      ensure(false, {type}, 'Unknown validator type')
  }
}

const makeTxOutput = (
  slot: number,
  txHash: string,
  outputIndex: number,
  txOutput: TransactionOutput,
) => ({
  txHash,
  slot,
  outputIndex,
  address: txOutput.address,
  datum: txOutput.datum,
  datumHash: txOutput.datumHash,
  value: serializeValue(txOutput.value),
})

// Pushes sync events
const parseTrackableTxOutputs = (slot: number, transactions: Transaction[]) => {
  const txOuts = transactions.flatMap((tx) =>
    tx.outputs.map((out, i) => ({
      txOutput: out,
      txHash: tx.id,
      outputIndex: i,
    })),
  )

  for (const {txOutput, txHash, outputIndex} of txOuts) {
    const address = tryDeserializeAddress(txOutput.address)
    if (!address) continue

    if (address.pubKeyHash === getWalletPubKeyHash()) {
      // We check agent utxos first and track them
      pushSyncEvent({
        type: 'agentTxOutput',
        txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
      })
      continue
    }

    // For all other utxos we check if that script hash is either
    // - a constant script we track
    // - is associated with an interesting launch
    const lookup = launchValidatorHashes[address.scriptHash]
    // if there's no hit, we skip to the next txOutput
    if (!lookup) continue
    const {type, launch} = lookup

    // We make sure the utxos have a validity token if applicable
    // otherwise we might track invalid/unspendable utxos
    if (!passesValidityToken(lookup, txOutput.value)) continue

    if (launch) {
      // For types that have the launch, we can just push the event
      pushSyncEvent({
        type: 'launchTxOutput',
        launchTxHash: launch.txHash,
        txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
        outputType: type,
      })
      continue
    }

    // The rest trackable utxos are on constant validator addresses
    // we need additional processing to figure out the launch
    switch (type) {
      // Fail proofs have node validator hash in the datum to identify the launch
      case 'failProof': {
        ensure(
          txOutput.datum != null,
          {txOutput},
          'Fail proof must have inline datum',
        )
        const datum = decodeDatum(failProofDatumCborSchema, txOutput.datum)
        ensure(
          datum != null,
          {txOutput},
          'Fail proof must have valid inline datum',
        )
        const nodeValidatorHash = datum.scriptHash
        const lookup = launchValidatorHashes[nodeValidatorHash]
        // If we don't track the stored hash as a node
        // for an interesting launch, we skip the utxo
        if (lookup?.type !== 'node') continue
        pushSyncEvent({
          type: 'launchTxOutput',
          launchTxHash: lookup.launch.txHash,
          txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
          outputType: 'failProof',
        })
        break
      }
      // Pool proofs have dex and assets the datum to identify the launch
      case 'poolProof': {
        ensure(
          txOutput.datum != null,
          {txOutput},
          'Pool proof must have inline datum',
        )
        const datum = decodeDatum(poolProofDatumCborSchema, txOutput.datum)
        ensure(
          datum != null,
          {txOutput},
          'Pool proof must have valid inline datum',
        )
        const projectUnit = createUnit(datum.projectSymbol, datum.projectToken)
        const raisingUnit = createUnit(datum.raisingSymbol, datum.raisingToken)
        const launch = interestingLaunchByUnits(projectUnit, raisingUnit)
        if (!launch) continue
        pushSyncEvent({
          type: 'launchTxOutput',
          launchTxHash: launch.txHash,
          txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
          outputType:
            datum.dex === 'WingRidersV2' ? 'wrPoolProof' : 'sundaePoolProof',
        })
        break
      }
      // Ref script carriers have reference scripts to identify the launch
      case 'refScriptCarrier': {
        const refScript = txOutput.script
        if (!refScript) continue
        if (refScript.language === 'native') continue
        const cborHex = refScript.cbor
        const version = ogmiosPlutusVersionToMeshVersion[refScript.language]
        // For some reason we need to double encode the script
        // otherwise the hashes are wrong
        const hash = resolveScriptHash(applyCborEncoding(cborHex), version)
        const lookup = launchValidatorHashes[hash]
        if (!lookup || !lookup.launch || lookup.type === 'rewardsHolder')
          continue
        // NOTE: null is only possible for a rewards holder
        //       as it's the only generated contract we do not deploy
        //       it should not appear on a ref script carrier
        //       even if it does, we explicitly skip it
        // TODO: make it into a constant validator
        const outputType = refScriptCarrierUtxoTypeFromValidatorHashType(
          lookup.type,
        )
        ensure(
          outputType != null,
          {lookup, txHash, txOutput},
          'Invalid ref script carrier type',
        )
        pushSyncEvent({
          type: 'launchTxOutput',
          launchTxHash: lookup.launch.txHash,
          txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
          outputType,
        })
        break
      }
      // Wr pools have assets in the datum to identify the launch
      case 'wrPool': {
        ensure(
          txOutput.datum != null,
          {txOutput},
          'Wr pool must have inline datum',
        )
        const datum = decodeDatum(wrPoolDatumCborSchema, txOutput.datum)
        ensure(
          datum != null,
          {txOutput},
          'Wr pool must have valid inline datum',
        )
        const unitA = createUnit(datum.assetASymbol, datum.assetAToken)
        const unitB = createUnit(datum.assetBSymbol, datum.assetBToken)
        const launch = interestingLaunchByUnits(unitA, unitB)
        if (!launch) continue
        pushSyncEvent({
          type: 'launchTxOutput',
          launchTxHash: launch.txHash,
          txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
          outputType: 'wrPool',
        })
        break
      }
      // Sundae pools have assets in the datum to identify the launch
      case 'sundaePool': {
        ensure(
          txOutput.datum != null,
          {txOutput},
          'Sundae pool must have inline datum',
        )
        const datum = decodeDatum(sundaePoolDatumCborSchema, txOutput.datum)
        ensure(
          datum != null,
          {txOutput},
          'Sundae pool must have valid inline datum',
        )
        const launch = interestingLaunchByUnits(datum.assetA, datum.assetB)
        if (!launch) continue
        pushSyncEvent({
          type: 'launchTxOutput',
          launchTxHash: launch.txHash,
          txOutput: makeTxOutput(slot, txHash, outputIndex, txOutput),
          outputType: 'sundaePool',
        })
        break
      }
      default:
        ensure(false, {type}, 'Unreachable validator hash type')
    }
  }
}

const launchTxMetadataSchema = getLaunchTxMetadataSchema({
  network: config.NETWORK,
  daoAdminPubKeyHash: DAO_ADMIN_PUB_KEY_HASH[config.NETWORK],
  daoFeeReceiverBech32Address: DAO_FEE_RECEIVER_BECH32_ADDRESS[config.NETWORK],
})

// To parse a launch creation we rely on the transaction metadata
// We also verify the configuration is correct here
// NOTE: We check the tx outputs are created with the correct tokens
//       Most of the other checks are done by the policies
//
// Pushes sync events
const parseInitLaunch = async (slot: number, transactions: Transaction[]) => {
  for (const tx of transactions) {
    // First we check the tx metadata;
    // if it's missing or doesn't match the schema, we skip
    const metadatum = tx.metadata?.labels[INIT_LAUNCH_TX_METADATA_LABEL]?.json
    if (!metadatum) continue
    const parsedMetadatum = parseOgmiosMetadatum(
      metadatum as MetadatumDetailedSchema,
    )
    const launchTxMetadata = launchTxMetadataSchema.safeParse(parsedMetadatum)
    if (launchTxMetadata.error) {
      logger.warn(
        {
          launchTxMetadata,
          parsedMetadatum,
          error: z.treeifyError(launchTxMetadata.error),
        },
        'Invalid launch tx metadata',
      )
      continue
    }

    // Then we generate the contracts and parse the transaction
    logger.info({txHash: tx.id, launchTxMetadata}, 'Found init launch tx')
    // TODO: make that sync, there's no reason to have it async
    const launchContracts = await generateLaunchpadContracts(
      launchTxMetadata.data.config,
      CONSTANT_CONTRACTS,
    )

    // We expect:
    // - head node (no stake) with a token
    // - project tokens holder (no stake) with a token
    // - at least 1 utxo with ada for the agent

    const indexedOutputs = tx.outputs.map(
      (out, i) => [out, i, tryDeserializeAddress(out.address)] as const,
    )

    // head node
    const nodes = indexedOutputs.filter(
      ([_out, _, address]) =>
        address?.scriptHash === launchContracts.nodeValidator.hash,
    )
    if (nodes.length !== 1) {
      logger.warn(
        {txHash: tx.id, nodes},
        'Invalid init launch tx: expected exactly one node',
      )
      continue
    }
    const [headNode, _headNodeOutputIndex] = nodes[0]!
    const nodeTokens =
      headNode.value[launchContracts.nodePolicy.hash]?.[
        launchContracts.nodeValidator.hash
      ]
    if (nodeTokens !== 1n) {
      logger.warn(
        {txHash: tx.id, headNode},
        'Invalid init launch tx: expected exactly one node token',
      )
      continue
    }

    // project tokens holder
    const projectTokensHolders = indexedOutputs.filter(
      ([_out, _, address]) =>
        address?.scriptHash === launchContracts.tokensHolderFirstValidator.hash,
    )
    if (projectTokensHolders.length !== 1) {
      logger.warn(
        {txHash: tx.id, projectTokensHolders},
        'Invalid init launch tx: expected exactly one project tokens holder',
      )
      continue
    }
    const [projectTokensHolder, firstProjectTokensHolderOutputIndex] =
      projectTokensHolders[0]!
    const projectTokens =
      projectTokensHolder.value[launchContracts.tokensHolderPolicy.hash]?.[
        launchContracts.tokensHolderFirstValidator.hash
      ]
    if (projectTokens !== 1n) {
      logger.warn(
        {txHash: tx.id, projectTokensHolder},
        'Invalid init launch tx: expected exactly one project tokens holder token',
      )
      continue
    }

    // NOTE: that allows double satisfaction when
    //       the agent is the one providing the tx
    //       that's probably alright

    // agent utxo on our change address
    // note that we just verify it's there
    // it's recorded by parseAgentTxOutputs
    const agentUtxos = indexedOutputs.filter(
      ([out, _index, address]) =>
        address?.pubKeyHash === getWalletPubKeyHash() &&
        out.value.ada.lovelace >= INIT_LAUNCH_AGENT_LOVELACE,
    )
    if (agentUtxos.length === 0) {
      logger.warn(
        {
          txHash: tx.id,
          agentAddress: getWalletChangeAddress(),
          agentPubKeyHash: getWalletPubKeyHash(),
          INIT_LAUNCH_AGENT_LOVELACE,
          indexedOutputs,
        },
        'Invalid init launch tx: expected at least one agent utxo with >=INIT_LAUNCH_AGENT_LOVELACE ada',
      )
      continue
    }

    const {assetName: projectTokenAssetName, policyId: projectTokenPolicyId} =
      parseAssetUnit(launchTxMetadata.data.config.projectToken)
    const {assetName: raisingTokenAssetName, policyId: raisingTokenPolicyId} =
      parseAssetUnit(launchTxMetadata.data.config.raisingToken)

    // A new launch is immediately interesting
    trackInterestingLaunch(
      {
        txHash: tx.id,
        projectUnit: launchTxMetadata.data.config.projectToken,
        raisingUnit: launchTxMetadata.data.config.raisingToken,
      },
      launchContracts,
    )
    // We push a new sync event
    // NOTE: we don't track the head node nor the first project tokens holder
    //       we rely on parseTrackableTxOutputs for that
    pushSyncEvent({
      type: 'initLaunch',
      launch: {
        txHash: tx.id,
        slot,
        projectTitle: launchTxMetadata.data.projectInfo.title,
        projectDescription: launchTxMetadata.data.projectInfo.description,
        projectUrl: launchTxMetadata.data.projectInfo.url,
        projectLogoUrl: launchTxMetadata.data.projectInfo.logoUrl,
        projectTokenomicsUrl: launchTxMetadata.data.projectInfo.tokenomicsUrl,
        projectWhitepaperUrl: launchTxMetadata.data.projectInfo.whitepaperUrl,
        projectTermsAndConditionsUrl:
          launchTxMetadata.data.projectInfo.termsAndConditionsUrl,
        projectAdditionalUrl: launchTxMetadata.data.projectInfo.additionalUrl,
        firstProjectTokensHolderTxHash: tx.id,
        firstProjectTokensHolderOutputIndex,
        ownerBech32Address: launchTxMetadata.data.config.ownerBech32Address,
        splitBps: Number(launchTxMetadata.data.config.splitBps),
        wrPoolValidatorHash: launchTxMetadata.data.config.wrPoolValidatorHash,
        wrFactoryValidatorHash:
          launchTxMetadata.data.config.wrFactoryValidatorHash,
        wrPoolCurrencySymbol: launchTxMetadata.data.config.wrPoolCurrencySymbol,
        sundaePoolScriptHash: launchTxMetadata.data.config.sundaePoolScriptHash,
        sundaeFeeTolerance: BigInt(
          launchTxMetadata.data.config.sundaeFeeTolerance,
        ),
        sundaeSettingsCurrencySymbol:
          launchTxMetadata.data.config.sundaeSettingsCurrencySymbol,
        startTime: launchTxMetadata.data.config.startTime,
        endTime: launchTxMetadata.data.config.endTime,
        projectTokenPolicyId,
        projectTokenAssetName,
        raisingTokenPolicyId,
        raisingTokenAssetName,
        projectMinCommitment: BigInt(
          launchTxMetadata.data.config.projectMinCommitment,
        ),
        projectMaxCommitment: BigInt(
          launchTxMetadata.data.config.projectMaxCommitment,
        ),
        totalTokens: BigInt(launchTxMetadata.data.config.totalTokens),
        tokensToDistribute: BigInt(
          launchTxMetadata.data.config.tokensToDistribute,
        ),
        raisedTokensPoolPartPercentage: Number(
          launchTxMetadata.data.config.raisedTokensPoolPartPercentage,
        ),
        daoFeeNumerator: Number(launchTxMetadata.data.config.daoFeeNumerator),
        daoFeeDenominator: Number(
          launchTxMetadata.data.config.daoFeeDenominator,
        ),
        daoFeeReceiverBech32Address:
          launchTxMetadata.data.config.daoFeeReceiverBech32Address,
        daoAdminPubKeyHash: launchTxMetadata.data.config.daoAdminPubKeyHash,
        collateral: BigInt(launchTxMetadata.data.config.collateral),
        starterTxHash: launchTxMetadata.data.config.starter.txHash,
        starterOutputIndex: launchTxMetadata.data.config.starter.outputIndex,
        vestingPeriodDuration:
          launchTxMetadata.data.config.vestingPeriodDuration,
        vestingPeriodDurationToFirstUnlock:
          launchTxMetadata.data.config.vestingPeriodDurationToFirstUnlock,
        vestingPeriodInstallments: Number(
          launchTxMetadata.data.config.vestingPeriodInstallments,
        ),
        vestingPeriodStart: launchTxMetadata.data.config.vestingPeriodStart,
        vestingValidatorHash: launchTxMetadata.data.config.vestingValidatorHash,
        presaleTierCs: launchTxMetadata.data.config.presaleTierCs,
        presaleTierStartTime: launchTxMetadata.data.config.presaleTierStartTime,
        defaultStartTime: launchTxMetadata.data.config.defaultStartTime,
        presaleTierMinCommitment: BigInt(
          launchTxMetadata.data.config.presaleTierMinCommitment,
        ),
        defaultTierMinCommitment: BigInt(
          launchTxMetadata.data.config.defaultTierMinCommitment,
        ),
        presaleTierMaxCommitment: BigInt(
          launchTxMetadata.data.config.presaleTierMaxCommitment,
        ),
        defaultTierMaxCommitment: BigInt(
          launchTxMetadata.data.config.defaultTierMaxCommitment,
        ),
        nodeAda: BigInt(launchTxMetadata.data.config.nodeAda),
        commitFoldFeeAda: BigInt(launchTxMetadata.data.config.commitFoldFeeAda),
        oilAda: BigInt(launchTxMetadata.data.config.oilAda),
      },
    })
  }
}

const flushAndRollback = async (point: 'origin' | Point) => {
  const rollbackSlot = point === 'origin' ? originPoint.slot : point.slot

  // Always flush first (noop if buffers are empty)
  await writeBuffersIfNecessary({
    threshold: 1,
    rollbackToSlot: rollbackSlot,
  })

  logger.info({point}, 'Rollback')

  await prisma.block.deleteMany({
    where: {slot: {gt: rollbackSlot}},
  })
  await resetTrackedUtxos()
  await resetInterestingLaunches()
}

// Write buffers into DB
// Returns true if touched the DB
const writeBuffersIfNecessary = async ({
  latestLedgerHeight,
  threshold,
  rollbackToSlot,
}: {
  latestLedgerHeight?: number
  threshold: number
  rollbackToSlot?: number
}): Promise<boolean> => {
  let touchedDb = false

  // If one buffer is being written others must as well as they might depend on each other
  // For example block determines in case of restarts the intersect for resuming
  // chain sync. If block buffer was written but other data not, it could get lost forever.
  if (syncEventBuffer.length >= threshold) {
    const blockBuffer = syncEventBuffer.filter((e) => e.type === 'block')
    const agentTxOutputBuffer = syncEventBuffer.filter(
      (e) => e.type === 'agentTxOutput',
    )
    const spentTxOutputBuffer = syncEventBuffer.filter(
      (e) => e.type === 'spentTxOutput',
    )
    const initLaunchBuffer = syncEventBuffer.filter(
      (e) => e.type === 'initLaunch',
    )
    const launchTxOutputBuffer = syncEventBuffer.filter(
      (e) => e.type === 'launchTxOutput',
    )

    const latestBlock = blockBuffer[blockBuffer.length - 1]
    const latestSlot = latestBlock?.data.slot
    const statsBeforeDbWrite = {
      blocks: blockBuffer.length,
      latestSlot,
      ...(latestLedgerHeight
        ? {progress: (latestBlock?.data.height || 1) / latestLedgerHeight}
        : {}),
      rollbackToSlot,
    }

    logger.debug(statsBeforeDbWrite, 'Start writing buffers to DB')

    // Stats which will be set in the SQL transaction
    const stats = {
      ...statsBeforeDbWrite,
    }

    // Do the inserts in one transaction to ensure data doesn't get corrupted if the
    // execution fails somewhere
    // Inserting data with unnest ensures that the query is stable and reduces the
    // amount of time it takes to parse the query.
    await prisma.$transaction(async () => {
      if (blockBuffer.length > 0)
        // Prisma when doing createMany doesn't use unnest, which is slower, so this raw query is more efficient
        await prisma.$executeRaw`INSERT INTO "Block" ("slot", "hash", "height")
                           SELECT *
                           FROM unnest(
                                   ${blockBuffer.map(({data: {slot}}) => slot)}::integer[],
                                   ${blockBuffer.map(({data: {hash}}) => hash)}::text[],
                                   ${blockBuffer.map(({data: {height}}) => height)}::integer[])`

      const txOutputsInsert = agentTxOutputBuffer
        .map((e) => e.txOutput)
        .concat(launchTxOutputBuffer.map((e) => e.txOutput))

      if (txOutputsInsert.length > 0)
        await prisma.txOutput.createMany({
          data: txOutputsInsert,
        })

      if (spentTxOutputBuffer.length > 0)
        // TODO: that can use less queries
        for (const {
          data: {spentSlot, spent},
        } of spentTxOutputBuffer)
          for (const {utxos, spentTxHash} of spent)
            for (const {transaction, index} of utxos)
              await prisma.txOutput.updateMany({
                where: {
                  txHash: transaction.id,
                  outputIndex: index,
                  spentSlot: null,
                },
                data: {spentSlot, spentTxHash},
              })

      if (initLaunchBuffer.length > 0)
        await prisma.launch.createMany({
          data: initLaunchBuffer.map((e) => e.launch),
        })

      if (launchTxOutputBuffer.length > 0)
        await saveLaunchTxOutputsFields(launchTxOutputBuffer)
    })

    logger.info(stats, 'Wrote buffers to DB')

    syncEventBuffer = []
    touchedDb = true
  }
  return touchedDb
}

// Does not create new TxOutput in the db.
// Updates affected launches by setting the relevant fields related to TxOutput.
// Also creates Node and RewardsHolder if applicable
const saveLaunchTxOutputsFields = async (
  launchTxOutputBuffer: (SyncEvent & {type: 'launchTxOutput'})[],
) => {
  for (const {launchTxHash, outputType, txOutput} of launchTxOutputBuffer) {
    switch (outputType) {
      case 'nodeValidatorRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            nodeValidatorRefScriptCarrierTxHash: txOutput.txHash,
            nodeValidatorRefScriptCarrierOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'nodePolicyRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            nodePolicyRefScriptCarrierTxHash: txOutput.txHash,
            nodePolicyRefScriptCarrierOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'firstProjectTokensHolderValidatorRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            firstProjectTokensHolderValidatorRefScriptCarrierTxHash:
              txOutput.txHash,
            firstProjectTokensHolderValidatorRefScriptCarrierOutputIndex:
              txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'projectTokensHolderPolicyRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            projectTokensHolderPolicyRefScriptCarrierTxHash: txOutput.txHash,
            projectTokensHolderPolicyRefScriptCarrierOutputIndex:
              txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'finalProjectTokensHolderValidatorRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            finalProjectTokensHolderValidatorRefScriptCarrierTxHash:
              txOutput.txHash,
            finalProjectTokensHolderValidatorRefScriptCarrierOutputIndex:
              txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'commitFoldValidatorRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            commitFoldValidatorRefScriptCarrierTxHash: txOutput.txHash,
            commitFoldValidatorRefScriptCarrierOutputIndex:
              txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'commitFoldPolicyRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            commitFoldPolicyRefScriptCarrierTxHash: txOutput.txHash,
            commitFoldPolicyRefScriptCarrierOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'rewardsFoldValidatorRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            rewardsFoldValidatorRefScriptCarrierTxHash: txOutput.txHash,
            rewardsFoldValidatorRefScriptCarrierOutputIndex:
              txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'rewardsFoldPolicyRefScriptCarrier': {
        await prisma.launch.update({
          data: {
            rewardsFoldPolicyRefScriptCarrierTxHash: txOutput.txHash,
            rewardsFoldPolicyRefScriptCarrierOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'node': {
        await prisma.node.create({
          data: {
            txHash: txOutput.txHash,
            outputIndex: txOutput.outputIndex,
            launchTxHash,
          },
        })
        break
      }
      case 'rewardsHolder': {
        await prisma.rewardsHolder.create({
          data: {
            launchTxHash,
            txHash: txOutput.txHash,
            outputIndex: txOutput.outputIndex,
          },
        })
        break
      }
      case 'firstProjectTokensHolder': {
        await prisma.launch.update({
          data: {
            firstProjectTokensHolderTxHash: txOutput.txHash,
            firstProjectTokensHolderOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'finalProjectTokensHolder': {
        await prisma.launch.update({
          data: {
            finalProjectTokensHolderTxHash: txOutput.txHash,
            finalProjectTokensHolderOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'commitFold': {
        await prisma.launch.update({
          data: {
            commitFoldTxHash: txOutput.txHash,
            commitFoldOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'rewardsFold': {
        await prisma.launch.update({
          data: {
            rewardsFoldTxHash: txOutput.txHash,
            rewardsFoldOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'failProof': {
        await prisma.launch.update({
          data: {
            failProofTxHash: txOutput.txHash,
            failProofOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'wrPoolProof': {
        await prisma.launch.update({
          data: {
            wrPoolProofTxHash: txOutput.txHash,
            wrPoolProofOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'sundaePoolProof': {
        await prisma.launch.update({
          data: {
            sundaePoolProofTxHash: txOutput.txHash,
            sundaePoolProofOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'wrPool': {
        await prisma.launch.update({
          data: {
            wrPoolTxHash: txOutput.txHash,
            wrPoolOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      case 'sundaePool': {
        await prisma.launch.update({
          data: {
            sundaePoolTxHash: txOutput.txHash,
            sundaePoolOutputIndex: txOutput.outputIndex,
          },
          where: {txHash: launchTxHash},
        })
        break
      }
      default:
        ensure(false, {outputType}, 'Unexpected output type')
    }
  }
}

// Find starting point for Ogmios, either 10th latest block (to prevent issues in case of
// rollbacks or default to origin
const findIntersect = async () => {
  const dbBlock = await prisma.block.findFirst({
    orderBy: {slot: 'desc'},
    skip: 10,
  })
  return dbBlock ? {id: dbBlock.hash, slot: dbBlock.slot} : originPoint
}

// Start the chain sync client, and add a listener on the underlying socket - connection to Ogmios
// If that closes try to restart the chain sync again
export const startChainSyncClient = async () => {
  // Before starting reset the event buffer;
  // required in case of restarts to get rid of stale
  // data and prevent double writes
  syncEventBuffer = []

  // We don't reset the tracked utxos cache here
  // the startup rollback takes care of it

  const context = await getOgmiosContext()

  const chainSyncClient = await createChainSynchronizationClient(context, {
    async rollForward(response, nextBlock) {
      // Skip Byron blocks, we are not interested in those addresses
      if (response.block.era === 'byron') return nextBlock()

      logger.trace(
        {
          slot: response.block.slot,
          height: response.block.height,
          era: response.block.era,
        },
        'Roll forward',
      )

      await processBlock(response.block)

      const latestLedgerHeight =
        response.tip === 'origin' ? originPoint.height : response.tip.height

      // Decide if to use buffering based on proximity to ledger tip
      const threshold =
        response.tip !== 'origin' &&
        response.tip.height - 10 < response.block.height
          ? 1
          : BUFFER_SIZE
      if (await writeBuffersIfNecessary({latestLedgerHeight, threshold})) {
        await resetTrackedUtxos()
        await resetInterestingLaunches()
      }

      return nextBlock()
    },

    async rollBackward(response, nextBlock) {
      logger.trace({point: response.point}, 'Roll backward')
      await flushAndRollback(response.point)
      nextBlock()
    },
  })

  // Rollback to latest intersect first
  const intersect = await findIntersect()
  await flushAndRollback(intersect)
  logger.info({intersect}, 'Ogmios - resuming chainSyncClient')
  await chainSyncClient.resume([intersect], 100)

  // Restart chainSyncClient on context close
  context.socket.addEventListener('close', () => startChainSyncClient())
}
