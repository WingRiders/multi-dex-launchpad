import {createChainSynchronizationClient} from '@cardano-ogmios/client'
import type {
  BlockPraos,
  Point,
  Transaction,
  TransactionOutputReference,
} from '@cardano-ogmios/schema'
import {deserializeAddress} from '@meshsdk/core'
import type {InputJsonValue} from '@prisma/client/runtime/client'
import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import superjson from 'superjson'
import type {Block, TxOutput} from '../../../prisma/generated/client'
import type {TxOutputCreateManyInput} from '../../../prisma/generated/models'
import {prisma} from '../../db/prisma-client'
import {originPoint} from '../../helpers'
import {logger} from '../../logger'
import {getWalletPubKeyHash} from '../wallet'
import {getOgmiosContext} from './ogmios'

// Buffering is suitable when doing the initial sync
const BUFFER_SIZE = 10_000

let blockBuffer: Block[] = []
let agentTxOutputBuffer: TxOutputCreateManyInput[] = []
let spentTxOutputBuffer: {
  spentSlot: number
  spent: {
    utxos: TransactionOutputReference[]
    spentTxHash: string
  }[]
}[] = []

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
    blockBuffer.length === 0,
    {blockBuffer},
    'Block buffer must be empty to reset the tracked utxos cache',
  )
  ensure(
    agentTxOutputBuffer.length === 0,
    {agentTxOutputBuffer},
    'Agent tx output buffer must be empty to reset the tracked utxos cache',
  )
  trackedUtxos = await prisma.txOutput.findMany({
    where: {spentSlot: null},
  })
}

// Aggregation logic is here
const processBlock = async (block: BlockPraos) => {
  blockBuffer.push({
    slot: block.slot,
    hash: block.id,
    height: block.height,
  })

  parseAgentTxOutputs(block.slot, block.transactions || [])
  parseSpentTxOutputs(block.slot, block.transactions || [])
}

const parseSpentTxOutputs = (slot: number, transactions: Transaction[]) => {
  const spent: (typeof spentTxOutputBuffer)[number]['spent'] = []
  for (const tx of transactions) {
    const spentTrackedUtxos = tx.inputs.filter(isUtxoTracked)
    if (spentTrackedUtxos.length > 0)
      spent.push({utxos: spentTrackedUtxos, spentTxHash: tx.id})
  }
  if (spent.length > 0) spentTxOutputBuffer.push({spentSlot: slot, spent})
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
    agentTxOutputBuffer.push(
      ...toAgent.map(([out, i]) => ({
        txHash: tx.id,
        address: out.address,
        outputIndex: i,
        datum: out.datum,
        datumHash: out.datumHash,
        // trust me
        value: superjson.serialize(out.value) as object as InputJsonValue,
        slot,
      })),
    )
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
  if (
    blockBuffer.length >= threshold ||
    agentTxOutputBuffer.length >= threshold
  ) {
    const latestBlock = blockBuffer[blockBuffer.length - 1]
    const latestSlot = latestBlock?.slot
    const statsBeforeDbWrite = {
      blocks: blockBuffer.length,
      latestSlot,
      ...(latestLedgerHeight
        ? {progress: (latestBlock?.height || 1) / latestLedgerHeight}
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
                                   ${blockBuffer.map(({slot}) => slot)}::integer[],
                                   ${blockBuffer.map(({hash}) => hash)}::text[],
                                   ${blockBuffer.map(({height}) => height)}::integer[])`

      if (agentTxOutputBuffer.length > 0)
        await prisma.txOutput.createMany({data: agentTxOutputBuffer})

      if (spentTxOutputBuffer.length > 0)
        // TODO: that can use less queries
        for (const {spentSlot, spent} of spentTxOutputBuffer)
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
    })

    logger.info(stats, 'Wrote buffers to DB')

    blockBuffer = []
    agentTxOutputBuffer = []
    spentTxOutputBuffer = []
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
  // Before starting flush the buffers, required in case of restarts to get rid of stale
  // data and prevent double writes
  blockBuffer = []
  agentTxOutputBuffer = []
  spentTxOutputBuffer = []

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
      if (await writeBuffersIfNecessary({latestLedgerHeight, threshold}))
        await resetTrackedUtxos()

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
