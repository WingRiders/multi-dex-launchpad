import type {Asset} from '@meshsdk/common'
import {
  addInitLaunch,
  bech32AddressSchema,
  COMMIT_FOLD_FEE_ADA,
  calculateTxValidityIntervalBeforeLaunchStart,
  DAO_ADMIN_PUB_KEY_HASH,
  DAO_FEE_DENOMINATOR,
  DAO_FEE_NUMERATOR,
  DAO_FEE_RECEIVER_BECH32_ADDRESS,
  generateConstantContracts,
  generateLaunchpadContracts,
  LAUNCH_COLLATERAL,
  type LaunchpadConfig,
  MAX_LENGTHS,
  makeBuilder,
  NODE_ADA,
  OIL_ADA,
  SPLIT_BPS_BASE,
  SUNDAE_POOL_SCRIPT_HASH,
  SUNDAE_SETTINGS_SYMBOL,
  scriptHashSchema,
  unitSchema,
  VESTING_PERIOD_DURATION,
  VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
  VESTING_PERIOD_INSTALLMENTS,
  VESTING_VALIDATOR_HASH,
  WR_FACTORY_VALIDATOR_HASH,
  WR_POOL_SYMBOL,
  WR_POOL_VALIDATOR_HASH,
} from '@wingriders/multi-dex-launchpad-common'
import {Command} from 'commander'
import {z} from 'zod'
import {
  offlineEvaluator,
  ogmiosProvider,
  updateFetcherFromOgmios,
} from '../agent/providers'
import {getWallet, initWallet} from '../agent/wallet'
import {config} from '../config'
import {logger} from '../logger'
import {parseDuration} from './helpers'

const inputFileSchema = z.object({
  launchpadConfig: z.object({
    ownerBech32Address: bech32AddressSchema,
    splitBps: z.int().min(0).max(SPLIT_BPS_BASE),
    sundaeFeeTolerance: z.coerce.bigint(),
    projectToken: unitSchema,
    raisingToken: unitSchema,
    projectMinCommitment: z.coerce.bigint(),
    projectMaxCommitment: z.coerce.bigint(),
    totalTokens: z.coerce.bigint(),
    tokensToDistribute: z.coerce.bigint(),
    raisedTokensPoolPartPercentage: z.int().min(0).max(100),
    presaleTierCs: scriptHashSchema,
    presaleTierMinCommitment: z.coerce.bigint(),
    defaultTierMinCommitment: z.coerce.bigint(),
    presaleTierMaxCommitment: z.coerce.bigint(),
    defaultTierMaxCommitment: z.coerce.bigint(),
  }),
  projectInfo: z.object({
    title: z.string().min(1).max(MAX_LENGTHS.title),
    description: z.string().min(1).max(MAX_LENGTHS.description),
    url: z.url({protocol: /^https$/}).max(MAX_LENGTHS.url),
    tokenomicsUrl: z.url({protocol: /^https$/}).max(MAX_LENGTHS.url),
    whitepaperUrl: z
      .url({protocol: /^https$/})
      .max(MAX_LENGTHS.url)
      .optional(),
    termsAndConditionsUrl: z
      .url({protocol: /^https$/})
      .max(MAX_LENGTHS.url)
      .optional(),
    additionalUrl: z
      .url({protocol: /^https$/})
      .max(MAX_LENGTHS.url)
      .optional(),
    logoUrl: z.url({protocol: /^ipfs$/}).max(MAX_LENGTHS.logoUrl),
  }),
  agentBech32Address: bech32AddressSchema,
})

export const buildInitLaunchCommand = () => {
  const command = new Command('init-launch')

  command
    .description('Build and submit the init launch transaction')
    .option(
      '-c, --config <filepath>',
      'Launch config JSON file with launchpad config and project information',
      'src/cli/data/launch.json5',
    )

    .option('--start-delay <duration>', 'Delay before launch starts', '15m')
    .option('--duration <duration>', 'Launch duration', '1d')

    .option(
      '--presale-offset <duration>',
      'Offset from start to presale tier start',
      '0m',
    )
    .option(
      '--default-offset <duration>',
      'Offset from presale start to default tier start (or from start if presale-offset is 0)',
      '0m',
    )
    .action(async (opts) => {
      logger.info('📄 Loading launch config...')
      const text = await Bun.file(opts.config).text()
      const raw = Bun.JSON5.parse(text)
      const parsedFile = inputFileSchema.parse(raw)

      logger.info('⏱ Calculating schedule...')
      const now = Date.now()
      const startTime = now + parseDuration(opts.startDelay)
      const endTime = startTime + parseDuration(opts.duration)
      const vestingPeriodStart = endTime

      const presaleTierStartTime = startTime + parseDuration(opts.presaleOffset)

      const defaultStartTime =
        presaleTierStartTime + parseDuration(opts.defaultOffset)

      if (startTime > presaleTierStartTime)
        throw new Error('Presale tier cannot start before launch start')

      if (presaleTierStartTime > defaultStartTime)
        throw new Error('Default tier cannot start before presale tier')

      logger.info('Init wallet...')
      await initWallet()
      const wallet = getWallet()
      await updateFetcherFromOgmios()
      logger.info('💰 Selecting starter UTxO...')
      const projectTokenAsset: Asset = {
        unit: parsedFile.launchpadConfig.projectToken,
        quantity: parsedFile.launchpadConfig.totalTokens.toString(),
      }
      const walletUtxos = await wallet.getUtxos()
      const starterUtxo = walletUtxos.filter((utxo) =>
        utxo.output.amount.some(
          (asset) => asset.unit === projectTokenAsset.unit,
        ),
      )[0]
      if (starterUtxo == null) {
        throw new Error(
          `There is no UTxO among ${walletUtxos.length} wallet UTxOs holding required quantity ${projectTokenAsset.quantity} of project tokens ${projectTokenAsset.unit}`,
        )
      }
      const launchpadConfig: LaunchpadConfig = {
        ...parsedFile.launchpadConfig,
        startTime: startTime,
        endTime: endTime,
        vestingPeriodStart: vestingPeriodStart,
        presaleTierStartTime: presaleTierStartTime,
        defaultStartTime: defaultStartTime,
        starter: starterUtxo.input,
        daoFeeReceiverBech32Address:
          DAO_FEE_RECEIVER_BECH32_ADDRESS[config.NETWORK],
        daoAdminPubKeyHash: DAO_ADMIN_PUB_KEY_HASH[config.NETWORK],
        wrPoolValidatorHash: WR_POOL_VALIDATOR_HASH[config.NETWORK],
        wrFactoryValidatorHash: WR_FACTORY_VALIDATOR_HASH[config.NETWORK],
        wrPoolCurrencySymbol: WR_POOL_SYMBOL[config.NETWORK],
        sundaePoolScriptHash: SUNDAE_POOL_SCRIPT_HASH[config.NETWORK],
        sundaeSettingsCurrencySymbol: SUNDAE_SETTINGS_SYMBOL[config.NETWORK],
        daoFeeNumerator: DAO_FEE_NUMERATOR,
        daoFeeDenominator: DAO_FEE_DENOMINATOR,
        collateral: LAUNCH_COLLATERAL,
        vestingPeriodDuration: VESTING_PERIOD_DURATION,
        vestingPeriodInstallments: VESTING_PERIOD_INSTALLMENTS,
        vestingPeriodDurationToFirstUnlock:
          VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
        vestingValidatorHash: VESTING_VALIDATOR_HASH,
        nodeAda: NODE_ADA,
        commitFoldFeeAda: COMMIT_FOLD_FEE_ADA,
        oilAda: OIL_ADA,
      }

      logger.info('Generating constant contracts...')
      const constantContracts = await generateConstantContracts({
        sundaePoolScriptHash: launchpadConfig.sundaePoolScriptHash,
        wrPoolSymbol: launchpadConfig.wrPoolCurrencySymbol,
        wrPoolValidatorHash: launchpadConfig.wrPoolValidatorHash,
      })

      logger.info('Generating launchpad contracts...')
      const launchpadContracts = await generateLaunchpadContracts(
        launchpadConfig,
        constantContracts,
      )

      const collateralUtxo = (await wallet.getCollateral())[0]
      if (collateralUtxo == null) {
        throw new Error('No collateral available in the wallet')
      }

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

      const validityInterval = calculateTxValidityIntervalBeforeLaunchStart(
        config.NETWORK,
        startTime,
        now,
      )

      addInitLaunch(
        b,
        launchpadConfig,
        parsedFile.projectInfo,
        launchpadContracts,
        parsedFile.agentBech32Address,
        starterUtxo.output,
        validityInterval.validityStartSlot,
        validityInterval.validityEndSlot,
      )

      const builtTx = await b.complete()
      logger.info({builtTx}, 'Built tx')

      const signedTx = await wallet.signTx(builtTx)
      logger.info({signedTx}, 'Signed tx')

      const txHash = await wallet.submitTx(signedTx)

      logger.info({txHash}, 'Submitted tx')

      logger.info('\n📅 Schedule Summary')
      logger.info(`Start:                ${new Date(startTime).toISOString()}`)
      logger.info(
        `Presale tier start:   ${new Date(presaleTierStartTime).toISOString()}`,
      )
      logger.info(
        `Default tier start:   ${new Date(defaultStartTime).toISOString()}`,
      )
      logger.info(`End:                  ${new Date(endTime).toISOString()}`)
      logger.info(
        `Vesting start:        ${new Date(vestingPeriodStart).toISOString()}`,
      )
    })

  return command
}
