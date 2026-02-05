import {
  type AddCreateCommitmentArgs,
  addCreateCommitment,
  calculateTxValidityIntervalForInsertNode,
  type LaunchpadConfig,
  makeBuilder,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import {Command} from 'commander'
import {z} from 'zod'
import {
  offlineEvaluator,
  ogmiosProvider,
  updateFetcherFromOgmios,
} from '../agent/providers'
import {
  getWallet,
  getWalletPubKeyHash,
  getWalletStakeKeyHash,
  initWallet,
} from '../agent/wallet'
import {config} from '../config'
import {findNodeToSpend} from '../db/helpers'
import {getFirstProjectTokensHolderUTxO, getLaunch} from '../endpoints/launch'
import {
  getNodePolicyRefScriptUtxo,
  getNodeValidatorRefScriptUtxo,
} from '../endpoints/ref-scripts'
import {getUTxO} from '../endpoints/utxo'
import {logger} from '../logger'

/**
 * Allows to create many nodes.
 *
 * Limitations:
 * - configured wallet is signing the transactions, so all nodes are created with one owner (multiple users are planned to test out rewards folding)
 * - only adding commitment is supported, removing commitment is not planned because that would be tested manually
 * - only default tier is supported because folding does not distinguish tiers
 */

const addNodeTransactionSchema = z.object({
  committed: z.coerce.bigint(),
})

type AddNodeTransaction = z.infer<typeof addNodeTransactionSchema>

const inputFileSchema = z.object({
  launchTxHash: z.string(),
  transactions: z.array(addNodeTransactionSchema),
})

const waitForNodeTx = (txHash: string) =>
  Result.tryPromise(() => getUTxO(txHash, 0), {
    retry: {
      times: 100,
      delayMs: 3_000,
      backoff: 'constant',
      shouldRetry: (e) => e.message.includes('not found'),
    },
  })

const processAddNodeTransactions = async (
  launchTxHash: string,
  launchpadConfig: LaunchpadConfig,
  addNodeTransactions: AddNodeTransaction[],
) => {
  const now = Date.now()
  const waitForDefaultStart = launchpadConfig.defaultStartTime - now
  if (waitForDefaultStart > 0) {
    logger.info(
      `Default tier not started yet, waiting ${waitForDefaultStart / 1000}s`,
    )
    await Bun.sleep(waitForDefaultStart)
    return processAddNodeTransactions(
      launchTxHash,
      launchpadConfig,
      addNodeTransactions,
    )
  }

  const addNodeTransaction = addNodeTransactions[0]
  if (addNodeTransaction == null) return // Finished processing

  logger.info('Init wallet...')
  await initWallet()
  const wallet = getWallet()
  const ownerPubKeyHash = getWalletPubKeyHash()
  const ownerStakeKeyHash = getWalletStakeKeyHash()

  logger.info('Finding node to spend...')
  const nodeToSpend = await findNodeToSpend({launchTxHash, ownerPubKeyHash})

  const [nodeValidatorRef, nodePolicyRef, firstProjectTokensHolderUTxO] =
    await Promise.all([
      getNodeValidatorRefScriptUtxo(launchTxHash),
      getNodePolicyRefScriptUtxo(launchTxHash),
      getFirstProjectTokensHolderUTxO(launchTxHash),
    ])

  logger.info('Updating fetcher with UTxOs from ogmios...')
  await updateFetcherFromOgmios([
    nodeToSpend,
    nodeValidatorRef,
    nodePolicyRef,
    firstProjectTokensHolderUTxO,
  ])
  const collateralUtxo = (await wallet.getCollateral())[0]
  if (collateralUtxo == null) {
    throw new Error('No collateral available in the wallet')
  }
  const walletUtxos = await wallet.getUtxos()

  logger.info('🚀 Building and submitting transaction...')
  const b = makeBuilder(
    await wallet.getChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )
    .txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
      collateralUtxo.output.amount,
      collateralUtxo.output.address,
    )
    .selectUtxosFrom(walletUtxos)

  const validityInterval = calculateTxValidityIntervalForInsertNode(
    config.NETWORK,
    launchpadConfig.defaultStartTime,
    launchpadConfig.endTime,
    now,
  )

  const addCreateCommitmentArgs: AddCreateCommitmentArgs = {
    config: {
      nodeAda: launchpadConfig.nodeAda,
      raisingToken: launchpadConfig.raisingToken,
    },
    committed: addNodeTransaction.committed,
    lowerTimeLimitSlot: validityInterval.validityStartSlot,
    upperTimeLimitSlot: validityInterval.validityEndSlot,
    tier: {type: 'default'},
    nodeToSpend,
    nodeValidatorRef,
    nodePolicyRef,
    firstProjectTokensHolderUTxO,
    ownerPubKeyHash,
    ownerStakeKeyHash,
  }

  addCreateCommitment(b, addCreateCommitmentArgs)

  const builtTx = await b.complete()
  logger.info({builtTx}, 'Built tx')

  const signedTx = await wallet.signTx(builtTx)
  logger.info({signedTx}, 'Signed tx')

  const txHash = await wallet.submitTx(signedTx)

  logger.info({txHash}, 'Submitted tx')

  const otherAddNodeTransactions = addNodeTransactions.slice(1)
  if (otherAddNodeTransactions.length > 0) {
    logger.info(
      `Waiting for tx to be aggregated to proceed with ${otherAddNodeTransactions.length} more nodes...`,
    )
    await waitForNodeTx(txHash)
    await processAddNodeTransactions(
      launchTxHash,
      launchpadConfig,
      otherAddNodeTransactions,
    )
  }
}

export const buildAddNodeCommand = () => {
  const command = new Command('add-node')

  command
    .description('Build and submit the node transactions')
    .option(
      '-c, --config <filepath>',
      'Add-node transactions plan JSON5 file',
      'src/cli/data/add-node.json5',
    )
    .action(async (opts) => {
      logger.info('📄 Loading add-node transactions plan...')
      const text = await Bun.file(opts.config).text()
      const raw = Bun.JSON5.parse(text)
      const parsedFile = inputFileSchema.parse(raw)

      logger.info('Loading launch from DB...')
      const {config} = await getLaunch(parsedFile.launchTxHash)
      await processAddNodeTransactions(
        parsedFile.launchTxHash,
        config,
        parsedFile.transactions,
      )
      logger.info(
        `Finished processing ${parsedFile.transactions.length} add-node transactions`,
      )
    })

  return command
}
