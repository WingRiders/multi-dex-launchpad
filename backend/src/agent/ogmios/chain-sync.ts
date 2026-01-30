import {createChainSynchronizationClient} from '@cardano-ogmios/client'
import type {
  BlockPraos,
  MetadatumDetailedSchema,
  Point,
  Transaction,
  TransactionOutputReference,
} from '@cardano-ogmios/schema'
import {deserializeAddress, parseAssetUnit} from '@meshsdk/core'
import type {JsonValue} from '@prisma/client/runtime/client'
import {
  DAO_ADMIN_PUB_KEY_HASH,
  DAO_FEE_RECEIVER_BECH32_ADDRESS,
  ensure,
  type GeneratedContracts,
  generateLaunchpadContracts,
  getLaunchTxMetadataSchema,
  INIT_LAUNCH_AGENT_LOVELACE,
  INIT_LAUNCH_TX_METADATA_LABEL,
  tryDeserializeAddress,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import z from 'zod'
import type {Block, TxOutput} from '../../../prisma/generated/client'
import type {
  LaunchCreateManyInput,
  NodeCreateManyInput,
  TxOutputCreateManyInput,
} from '../../../prisma/generated/models'
import {config} from '../../config'
import {prismaLaunchToLaunchConfig} from '../../db/helpers'
import {prisma} from '../../db/prisma-client'
import {originPoint, serializeValue} from '../../helpers'
import {logger} from '../../logger'
import {CONSTANT_CONTRACTS} from '../constants'
import {getWalletChangeAddress, getWalletPubKeyHash} from '../wallet'
import {getOgmiosContext} from './ogmios'

// Buffering is suitable when doing the initial sync
const BUFFER_SIZE = 10_000

type SyncEvent =
  | {
      type: 'block'
      data: Block
    }
  | {
      type: 'txOutput'
      data: TxOutputCreateManyInput
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
      txOutputs: TxOutputCreateManyInput[]
      node: NodeCreateManyInput
    }

let syncEventBuffer: SyncEvent[] = []

// When we aggregate launches, we track them in cache.
// Once a launch stops being interesting, it's no longer tracked.
// The tracking stops on the next flushing, not immediately.
// Interesting launches provide access to their contracts so the transactions can be parsed.
//
// A launch is defined as interesting if it has at least one associated unspent utxo
// or at least one of those utxos hasn't been created yet.
// Only spent utxos count towards making a launch not interesting.
//
// - node validator ref script carrier
// - node policy ref script carrier
// - first project tokens holder validator ref script carrier
// - project tokens holder policy ref script carrier
// - final project tokens holder validator ref script carrier
// - commit fold validator ref script carrier
// - commit fold policy ref script carrier
// - rewards fold validator ref script carrier
// - rewards fold policy ref script carrier
// - rewards holder validator ref script carrier
//
// - nodes
// - rewards holders
//
// - commit fold
// - rewards fold
// - first project tokens holder
// - final project tokens holder
//
// These, however, do not affect whether the launch is interesting
// - fail proof      <- unspendable
// - pool proofs     <- unspendable
// - wr/sundae pools <- samsaricly rebirthed every time they die
let interestingLaunches: {
  launch: {txHash: string}
  contracts: GeneratedContracts
}[] = []

const resetInterestingLaunches = async () => {
  ensure(
    syncEventBuffer.length === 0,
    {syncEventBuffer},
    'Sync event buffer must be empty to reset the interesting launches cache',
  )
  const launches = await prisma.launch.findMany({
    // Non-interesting launches have all their important utxos spent
    // Interesting launches are NOT those
    where: {
      NOT: {
        AND: [
          {nodeValidatorRefScriptCarrier: {spentSlot: {not: null}}},
          {nodePolicyRefScriptCarrier: {spentSlot: {not: null}}},
          {
            firstProjectTokensHolderValidatorRefScriptCarrier: {
              spentSlot: {not: null},
            },
          },
          {
            projectTokensHolderPolicyRefScriptCarrier: {
              spentSlot: {not: null},
            },
          },
          {
            finalProjectTokensHolderValidatorRefScriptCarrier: {
              spentSlot: {not: null},
            },
          },
          {
            commitFoldValidatorRefScriptCarrier: {spentSlot: {not: null}},
          },
          {commitFoldPolicyRefScriptCarrier: {spentSlot: {not: null}}},
          {
            rewardsFoldValidatorRefScriptCarrier: {spentSlot: {not: null}},
          },
          {rewardsFoldPolicyRefScriptCarrier: {spentSlot: {not: null}}},
          {
            rewardsHolderValidatorRefScriptCarrier: {spentSlot: {not: null}},
          },
          {nodes: {some: {txOut: {spentSlot: {not: null}}}}},
          {rewardsHolders: {some: {txOut: {spentSlot: {not: null}}}}},
          {commitFold: {spentSlot: {not: null}}},
          {rewardsFold: {spentSlot: {not: null}}},
          {firstProjectTokensHolder: {spentSlot: {not: null}}},
          {finalProjectTokensHolder: {spentSlot: {not: null}}},
        ],
      },
    },
  })

  interestingLaunches = []
  for (const launch of launches) {
    const contracts = await generateLaunchpadContracts(
      prismaLaunchToLaunchConfig(launch),
      CONSTANT_CONTRACTS,
    )
    interestingLaunches.push({launch: {txHash: launch.txHash}, contracts})
  }
  logger.debug(
    {
      interestingLaunches: interestingLaunches.map((l) => l.launch.txHash),
    },
    'Reset interesting launches',
  )
}

// TODO: we might want to switch to a set/map?
let trackedUtxos: TxOutput[] = []
const isUtxoTracked = (utxo: TransactionOutputReference): boolean => {
  for (const trackedUtxo of trackedUtxos)
    if (
      trackedUtxo.txHash === utxo.transaction.id &&
      trackedUtxo.outputIndex === utxo.index
    )
      return true

  return false
}

export const getAddressTrackedUtxos = (bech32Address: string): TxOutput[] =>
  trackedUtxos.filter((utxo) => utxo.address === bech32Address)

// Reset the tracked utxos cache.
// Must be called after the buffers are emptied.
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
  syncEventBuffer.push({
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
  parseAgentTxOutputs(block.slot, block.transactions || [])
  parseInitLaunch(block.slot, block.transactions || [])
  parseSpentTxOutputs(block.slot, block.transactions || [])
}

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
    syncEventBuffer.push({
      type: 'spentTxOutput',
      data: {spentSlot: slot, spent},
    })
}

const parseAgentTxOutputs = (slot: number, transactions: Transaction[]) => {
  for (const tx of transactions) {
    const toAgent = tx.outputs
      .map((out, i) => [out, i] as const)
      .filter(([out, _]) =>
        Result.try(
          () =>
            // Throws on base58 addresses
            deserializeAddress(out.address).pubKeyHash ===
            getWalletPubKeyHash(),
        ).unwrapOr(false),
      )
      .map(([out, i]) => ({
        slot,
        txHash: tx.id,
        address: out.address,
        outputIndex: i,
        datum: out.datum,
        datumHash: out.datumHash,
        value: serializeValue(out.value),
      }))
    trackedUtxos.push(
      ...toAgent.map((out) => ({
        ...out,
        slot,
        spentTxHash: null,
        spentSlot: null,
        datum: out.datum || null,
        datumHash: out.datumHash || null,
        value: out.value as JsonValue,
      })),
    )
    syncEventBuffer.push(
      ...toAgent.map((out) => ({
        type: 'txOutput' as const,
        data: out,
      })),
    )
  }
}

// Returns:
// type t =
//   | bigint
//   | string
//   | t[]
//   | Record<t, t>
// The TS returns unknown because recursive type aliases are not allowed
const parseOgmiosMetadatum = (metadatum: MetadatumDetailedSchema): unknown => {
  if ('int' in metadatum) return metadatum.int
  if ('string' in metadatum) return metadatum.string
  if ('bytes' in metadatum) return metadatum.bytes
  if ('list' in metadatum) return metadatum.list.map(parseOgmiosMetadatum)
  if ('map' in metadatum)
    return Object.fromEntries(
      metadatum.map.map(({k, v}) => [
        parseOgmiosMetadatum(k),
        parseOgmiosMetadatum(v),
      ]),
    )
  ensure(false, {metadatum}, 'Unreachable metadatum')
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
    const [headNode, headNodeOutputIndex] = nodes[0]!
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

    const txOutputs = [
      // head node
      {
        txHash: tx.id,
        slot,
        outputIndex: headNodeOutputIndex,
        address: headNode.address,
        datum: headNode.datum,
        datumHash: headNode.datumHash,
        value: serializeValue(headNode.value),
      },
      // first project tokens holder
      {
        txHash: tx.id,
        slot,
        outputIndex: firstProjectTokensHolderOutputIndex,
        address: projectTokensHolder.address,
        datum: projectTokensHolder.datum,
        datumHash: projectTokensHolder.datumHash,
        value: serializeValue(projectTokensHolder.value),
      },
    ]
    // A new launch is immediately interesting
    interestingLaunches.push({
      launch: {txHash: tx.id},
      contracts: launchContracts,
    })
    // We track head node and first project tokens holder
    trackedUtxos.push(
      ...txOutputs.map((out) => ({
        ...out,
        datum: out.datum || null,
        datumHash: out.datumHash || null,
        spentTxHash: null,
        spentSlot: null,
        value: out.value as JsonValue,
      })),
    )
    // We push a new sync event
    syncEventBuffer.push({
      type: 'initLaunch',
      txOutputs,
      node: {
        txHash: tx.id,
        outputIndex: headNodeOutputIndex,
        launchTxHash: tx.id,
      },
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
    const txOutputBuffer = syncEventBuffer.filter((e) => e.type === 'txOutput')
    const spentTxOutputBuffer = syncEventBuffer.filter(
      (e) => e.type === 'spentTxOutput',
    )
    const initLaunchBuffer = syncEventBuffer.filter(
      (e) => e.type === 'initLaunch',
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

      if (txOutputBuffer.length > 0)
        await prisma.txOutput.createMany({
          data: txOutputBuffer.map((e) => e.data),
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

      if (initLaunchBuffer.length > 0) {
        await prisma.txOutput.createMany({
          data: initLaunchBuffer.flatMap((e) => e.txOutputs),
        })
        await prisma.launch.createMany({
          data: initLaunchBuffer.map((e) => e.launch),
        })
        await prisma.node.createMany({
          data: initLaunchBuffer.map((e) => e.node),
        })
      }
    })

    logger.info(stats, 'Wrote buffers to DB')

    syncEventBuffer = []
    touchedDb = true
  }
  return touchedDb
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
