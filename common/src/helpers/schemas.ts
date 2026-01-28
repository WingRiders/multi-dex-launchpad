import z from 'zod'
import {
  COMMIT_FOLD_FEE_ADA,
  DAO_FEE_DENOMINATOR,
  DAO_FEE_NUMERATOR,
  LAUNCH_COLLATERAL,
  MAX_LENGTHS,
  type Network,
  NODE_ADA,
  OIL_ADA,
  SPLIT_BPS_BASE,
  SUNDAE_POOL_SCRIPT_HASH,
  SUNDAE_SETTINGS_SYMBOL,
  VESTING_PERIOD_DURATION,
  VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK,
  VESTING_PERIOD_INSTALLMENTS,
  VESTING_VALIDATOR_HASH,
  WR_FACTORY_VALIDATOR_HASH,
  WR_POOL_SYMBOL,
  WR_POOL_VALIDATOR_HASH,
} from '..'
import {LOVELACE_UNIT} from './unit'

export const hexStringSchema = z
  .string()
  .regex(/^([0-9a-fA-F]{2})*$/, 'Must be a hex string')

export const scriptHashSchema = hexStringSchema.length(56)

export const assetNameSchema = hexStringSchema.max(64)

// TODO: that can be better
export const bech32AddressSchema = z.string().startsWith('addr')

export const pubKeyHashSchema = hexStringSchema.length(56)

export const txHashSchema = hexStringSchema.length(64)

const MAX_INT64 = 9223372036854775807n

export const quantitySchema = z
  .string()
  .regex(/^\d+$/, 'Must be an integer string')
  .refine((v) => BigInt(v) <= MAX_INT64)

// Mesh units are 'lovelace' | (policy id + asset name)
export const unitSchema = z.union([
  z.literal(LOVELACE_UNIT),
  hexStringSchema.min(56).max(56 + 64),
])

export const txInputSchema = z.object({
  txHash: txHashSchema,
  outputIndex: z.number().nonnegative(),
})

export const projectInfoTxMetadataSchema = z.object({
  title: z.string().max(MAX_LENGTHS.title),
  description: z.string().max(MAX_LENGTHS.description),
  url: z.url().max(MAX_LENGTHS.url),
  logoUrl: z.url().max(MAX_LENGTHS.logoUrl),
  tokenomicsUrl: z.url().max(MAX_LENGTHS.url),
  whitepaperUrl: z.url().max(MAX_LENGTHS.url).optional(),
  termsAndConditionsUrl: z.url().max(MAX_LENGTHS.url).optional(),
  additionalUrl: z.url().max(MAX_LENGTHS.url).optional(),
})
export type ProjectInfoTxMetadata = z.infer<typeof projectInfoTxMetadataSchema>

export type LaunchTxMetadataSchemaOptions = {
  network: Network
  daoFeeReceiverBech32Address: string
  daoAdminPubKeyHash: string
}

// NOTE: instead of z.literal(xxx) we use z.type().refine(v => v === xxx)
//       so the types remain wide enough, otherwise they won't match LaunchpadConfig
export const getLaunchpadConfigTxMetadataSchema = ({
  network,
  daoAdminPubKeyHash,
  daoFeeReceiverBech32Address,
}: LaunchTxMetadataSchemaOptions) =>
  z
    .object({
      ownerBech32Address: bech32AddressSchema,
      splitBps: z.int().nonnegative().max(SPLIT_BPS_BASE),
      wrPoolValidatorHash: scriptHashSchema.refine(
        (v) => v === WR_POOL_VALIDATOR_HASH[network],
        {error: `Must be equal to ${WR_POOL_VALIDATOR_HASH[network]}`},
      ),
      wrFactoryValidatorHash: scriptHashSchema.refine(
        (v) => v === WR_FACTORY_VALIDATOR_HASH[network],
        {error: `Must be equal to ${WR_FACTORY_VALIDATOR_HASH[network]}`},
      ),
      wrPoolCurrencySymbol: scriptHashSchema.refine(
        (v) => v === WR_POOL_SYMBOL[network],
        {error: `Must be equal to ${WR_POOL_SYMBOL[network]}`},
      ),
      sundaePoolScriptHash: scriptHashSchema.refine(
        (v) => v === SUNDAE_POOL_SCRIPT_HASH[network],
        {error: `Must be equal to ${SUNDAE_POOL_SCRIPT_HASH[network]}`},
      ),
      sundaeFeeTolerance: quantitySchema,
      sundaeSettingsCurrencySymbol: scriptHashSchema.refine(
        (v) => v === SUNDAE_SETTINGS_SYMBOL[network],
        {error: `Must be equal to ${SUNDAE_SETTINGS_SYMBOL[network]}`},
      ),
      startTime: z.int().nonnegative(),
      endTime: z.int().nonnegative(),
      projectToken: unitSchema,
      raisingToken: unitSchema,
      projectMinCommitment: quantitySchema,
      projectMaxCommitment: quantitySchema,
      totalTokens: quantitySchema,
      tokensToDistribute: quantitySchema,
      raisedTokensPoolPartPercentage: z.int().nonnegative().max(100),
      daoFeeNumerator: z
        .int()
        .nonnegative()
        .refine((v) => v === DAO_FEE_NUMERATOR, {
          error: `Must be equal to ${DAO_FEE_NUMERATOR}`,
        }),
      daoFeeDenominator: z
        .int()
        .nonnegative()
        .refine((v) => v === DAO_FEE_DENOMINATOR, {
          error: `Must be equal to ${DAO_FEE_DENOMINATOR}`,
        }),
      daoFeeReceiverBech32Address: bech32AddressSchema.refine(
        (v) => v === daoFeeReceiverBech32Address,
        {error: `Must be equal to ${daoFeeReceiverBech32Address}`},
      ),
      daoAdminPubKeyHash: pubKeyHashSchema.refine(
        (v) => v === daoAdminPubKeyHash,
        {error: `Must be equal to ${daoAdminPubKeyHash}`},
      ),
      collateral: quantitySchema.refine((v) => v === LAUNCH_COLLATERAL, {
        error: `Must be equal to ${LAUNCH_COLLATERAL}`,
      }),
      vestingPeriodDuration: z
        .int()
        .nonnegative()
        .refine((v) => v === VESTING_PERIOD_DURATION, {
          error: `Must be equal to ${VESTING_PERIOD_DURATION}`,
        }),
      vestingPeriodInstallments: z
        .int()
        .nonnegative()
        .refine((v) => v === VESTING_PERIOD_INSTALLMENTS, {
          error: `Must be equal to ${VESTING_PERIOD_INSTALLMENTS}`,
        }),
      vestingPeriodDurationToFirstUnlock: z
        .int()
        .nonnegative()
        .refine((v) => v === VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK, {
          error: `Must be equal to ${VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK}`,
        }),
      // NOTE: must be equal to end time
      vestingPeriodStart: z.int().nonnegative(),
      vestingValidatorHash: scriptHashSchema.refine(
        (v) => v === VESTING_VALIDATOR_HASH,
        {error: `Must be equal to ${VESTING_VALIDATOR_HASH}`},
      ),
      presaleTierCs: scriptHashSchema,
      presaleTierStartTime: z.int().nonnegative(),
      defaultStartTime: z.int().nonnegative(),
      presaleTierMinCommitment: quantitySchema,
      defaultTierMinCommitment: quantitySchema,
      presaleTierMaxCommitment: quantitySchema,
      defaultTierMaxCommitment: quantitySchema,
      nodeAda: quantitySchema.refine((v) => v === NODE_ADA, {
        error: `Must be equal to ${NODE_ADA}`,
      }),
      commitFoldFeeAda: quantitySchema.refine(
        (v) => v === COMMIT_FOLD_FEE_ADA,
        {error: `Must be equal to ${COMMIT_FOLD_FEE_ADA}`},
      ),
      starter: txInputSchema,
      oilAda: quantitySchema.refine((v) => v === OIL_ADA, {
        error: `Must be equal to ${OIL_ADA}`,
      }),
    })
    .refine((c) => c.vestingPeriodStart === c.endTime, {
      error: 'vestingPeriodStart must be equal to endTime',
      path: ['vestingPeriodStart'],
    })

export const getLaunchTxMetadataSchema = (
  opts: LaunchTxMetadataSchemaOptions,
) =>
  z.object({
    config: getLaunchpadConfigTxMetadataSchema(opts),
    projectInfo: projectInfoTxMetadataSchema,
  })
export type LaunchTxMetadata = z.infer<
  ReturnType<typeof getLaunchTxMetadataSchema>
>
