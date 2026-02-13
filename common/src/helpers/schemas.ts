import {
  buildBaseAddress,
  buildEnterpriseAddress,
  CredentialType,
  Hash28ByteBase16,
} from '@meshsdk/core-cst'
import z, {type ZodType} from 'zod'
import {
  COMMIT_FOLD_FEE_ADA,
  DAO_FEE_DENOMINATOR,
  DAO_FEE_NUMERATOR,
  LAUNCH_COLLATERAL,
  MAX_LENGTHS,
  type Network,
  NODE_ADA,
  networkToNetworkId,
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

export const policyIdSchema = z.union([scriptHashSchema, z.literal('')])

export const assetNameSchema = hexStringSchema.max(64)

// TODO: that can be better
export const bech32AddressSchema = z.string().startsWith('addr')

export const pubKeyHashSchema = hexStringSchema.length(56)

export const txHashSchema = hexStringSchema.length(64)

export const MAX_INT64 = 9223372036854775807n

export const bigintQuantitySchema = z.bigint().min(0n).max(MAX_INT64)

// NOTE: use .pipe(z.string()....) for additional validation
export const metadataStringSchema = () =>
  z
    // NOTE: max string size is 64 bytes
    // REVIEW: that would be hex string, so max character count is 128, right?
    .union([z.string().max(128), z.array(z.string().max(128))])
    .transform((v) => (Array.isArray(v) ? v.join('') : v))

export const makeMaybeCborSchema = <T extends ZodType>(inner: T) =>
  z
    .union([
      // Just
      z.object({
        constructor: z.literal(0n),
        fields: z.tuple([inner]),
      }),
      // Nothing
      z.object({
        constructor: z.literal(1n),
        fields: z.tuple([]),
      }),
    ])
    .transform((res) => (res.constructor === 0n ? res.fields[0] : null))

// Mesh units are 'lovelace' | (policy id + asset name)
export const unitSchema = z.union([
  z.literal(LOVELACE_UNIT),
  hexStringSchema.min(56).max(56 + 64),
])

export const txInputSchema = z.object({
  txHash: txHashSchema,
  outputIndex: z.bigint().nonnegative().transform(Number),
})

// AddressCredential
const pubKeyCredentialSchema = z.object({
  constructor: z.literal(0n),
  fields: z.tuple([z.object({bytes: pubKeyHashSchema})]),
})

const scriptCredentialSchema = z.object({
  constructor: z.literal(1n),
  fields: z.tuple([z.object({bytes: pubKeyHashSchema})]),
})

const addressCredentialSchema = z.union([
  pubKeyCredentialSchema,
  scriptCredentialSchema,
])

// StakingCredential
const stakingHashSchema = z.object({
  constructor: z.literal(0n),
  fields: z.tuple([addressCredentialSchema]),
})

const stakingPtrSchema = z.object({
  constructor: z.literal(1n),
  fields: z.tuple([z.bigint(), z.bigint(), z.bigint()]), // blockIndex, txIndex, certificateIndex
})

const stakingCredentialSchema = z.union([stakingHashSchema, stakingPtrSchema])

// MaybeStakingCredential
const maybeStakingCredentialSchema = makeMaybeCborSchema(
  stakingCredentialSchema,
)

// Full Address
const addressCborSchema = z.object({
  constructor: z.literal(0n),
  fields: z.tuple([addressCredentialSchema, maybeStakingCredentialSchema]),
})

// Transform to Bech32 using Mesh
export const getAddressSchema = (network: Network) =>
  addressCborSchema.transform((addrCbor) => {
    const [paymentCred, maybeStakeCred] = addrCbor.fields

    const paymentKeyHash = Hash28ByteBase16(paymentCred.fields[0].bytes)

    const credType = (cred: {constructor: 0n | 1n}) =>
      cred.constructor === 0n
        ? CredentialType.KeyHash
        : CredentialType.ScriptHash

    if (maybeStakeCred == null) {
      return buildEnterpriseAddress(
        networkToNetworkId[network],
        paymentKeyHash,
        // TODO Allow script enterprise address
        // credType(paymentCred),
      )
        .toAddress()
        .toBech32()
        .toString()
    }
    if (maybeStakeCred.constructor === 1n) {
      throw new Error('StakingPtr is not supported')
    }
    const stakeCred = maybeStakeCred.fields[0]
    const stakeKeyHash = Hash28ByteBase16(stakeCred.fields[0].bytes)

    return buildBaseAddress(
      networkToNetworkId[network],
      paymentKeyHash,
      stakeKeyHash,
      credType(paymentCred),
      credType(stakeCred),
    )
      .toAddress()
      .toBech32()
      .toString()
  })

export const projectInfoTxMetadataSchema = z.object({
  title: metadataStringSchema().pipe(z.string().max(MAX_LENGTHS.title)),
  description: metadataStringSchema().pipe(
    z.string().max(MAX_LENGTHS.description),
  ),
  url: metadataStringSchema().pipe(z.url().max(MAX_LENGTHS.url)),
  logoUrl: metadataStringSchema().pipe(z.url().max(MAX_LENGTHS.url)),
  tokenomicsUrl: metadataStringSchema().pipe(z.url().max(MAX_LENGTHS.url)),
  whitepaperUrl: metadataStringSchema()
    .pipe(z.url().max(MAX_LENGTHS.url))
    .optional(),
  termsAndConditionsUrl: metadataStringSchema()
    .pipe(z.url().max(MAX_LENGTHS.url))
    .optional(),
  additionalUrl: metadataStringSchema()
    .pipe(z.url().max(MAX_LENGTHS.url))
    .optional(),
})
export type ProjectInfoTxMetadata = z.infer<typeof projectInfoTxMetadataSchema>

export type LaunchTxMetadataSchemaOptions = {
  network: Network
  daoFeeReceiverBech32Address: string
  daoAdminPubKeyHash: string
}

const bech32AddressMetadataSchema =
  metadataStringSchema().pipe(bech32AddressSchema)

// NOTE: instead of z.literal(xxx) we use z.type().refine(v => v === xxx)
//       so the types remain wide enough, otherwise they won't match LaunchConfig
export const getLaunchConfigTxMetadataSchema = ({
  network,
  daoAdminPubKeyHash,
  daoFeeReceiverBech32Address,
}: LaunchTxMetadataSchemaOptions) =>
  z
    .object({
      ownerBech32Address: bech32AddressMetadataSchema,
      splitBps: z
        .bigint()
        .nonnegative()
        .max(BigInt(SPLIT_BPS_BASE))
        .transform(Number),
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
      sundaeFeeTolerance: bigintQuantitySchema,
      sundaeSettingsCurrencySymbol: scriptHashSchema.refine(
        (v) => v === SUNDAE_SETTINGS_SYMBOL[network],
        {error: `Must be equal to ${SUNDAE_SETTINGS_SYMBOL[network]}`},
      ),
      startTime: z.bigint().nonnegative().transform(Number),
      endTime: z.bigint().nonnegative().transform(Number),
      projectToken: unitSchema,
      raisingToken: unitSchema,
      projectMinCommitment: bigintQuantitySchema,
      projectMaxCommitment: bigintQuantitySchema,
      totalTokens: bigintQuantitySchema,
      tokensToDistribute: bigintQuantitySchema,
      raisedTokensPoolPartPercentage: z
        .bigint()
        .nonnegative()
        .max(100n)
        .transform(Number),
      daoFeeNumerator: z
        .bigint()
        .nonnegative()
        .refine((v) => v === DAO_FEE_NUMERATOR, {
          error: `Must be equal to ${DAO_FEE_NUMERATOR}`,
        }),
      daoFeeDenominator: z
        .bigint()
        .nonnegative()
        .refine((v) => v === DAO_FEE_DENOMINATOR, {
          error: `Must be equal to ${DAO_FEE_DENOMINATOR}`,
        }),
      daoFeeReceiverBech32Address: bech32AddressMetadataSchema.refine(
        (v) => v === daoFeeReceiverBech32Address,
        {error: `Must be equal to ${daoFeeReceiverBech32Address}`},
      ),
      daoAdminPubKeyHash: pubKeyHashSchema.refine(
        (v) => v === daoAdminPubKeyHash,
        {error: `Must be equal to ${daoAdminPubKeyHash}`},
      ),
      collateral: bigintQuantitySchema.refine((v) => v === LAUNCH_COLLATERAL, {
        error: `Must be equal to ${LAUNCH_COLLATERAL}`,
      }),
      vestingPeriodDuration: z
        .bigint()
        .nonnegative()
        .refine((v) => v === VESTING_PERIOD_DURATION, {
          error: `Must be equal to ${VESTING_PERIOD_DURATION}`,
        }),
      vestingPeriodInstallments: z
        .bigint()
        .nonnegative()
        .refine((v) => v === VESTING_PERIOD_INSTALLMENTS, {
          error: `Must be equal to ${VESTING_PERIOD_INSTALLMENTS}`,
        }),
      vestingPeriodDurationToFirstUnlock: z
        .bigint()
        .nonnegative()
        .refine((v) => v === VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK, {
          error: `Must be equal to ${VESTING_PERIOD_DURATION_TO_FIRST_UNLOCK}`,
        }),
      // NOTE: must be equal to end time
      vestingPeriodStart: z.bigint().nonnegative().transform(Number),
      vestingValidatorHash: scriptHashSchema.refine(
        (v) => v === VESTING_VALIDATOR_HASH,
        {error: `Must be equal to ${VESTING_VALIDATOR_HASH}`},
      ),
      presaleTierCs: policyIdSchema,
      presaleTierStartTime: z.bigint().nonnegative().transform(Number),
      defaultStartTime: z.bigint().nonnegative().transform(Number),
      presaleTierMinCommitment: bigintQuantitySchema,
      defaultTierMinCommitment: bigintQuantitySchema,
      presaleTierMaxCommitment: bigintQuantitySchema,
      defaultTierMaxCommitment: bigintQuantitySchema,
      nodeAda: bigintQuantitySchema.refine((v) => v === NODE_ADA, {
        error: `Must be equal to ${NODE_ADA}`,
      }),
      commitFoldFeeAda: bigintQuantitySchema.refine(
        (v) => v === COMMIT_FOLD_FEE_ADA,
        {error: `Must be equal to ${COMMIT_FOLD_FEE_ADA}`},
      ),
      starter: txInputSchema,
      oilAda: bigintQuantitySchema.refine((v) => v === OIL_ADA, {
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
    config: getLaunchConfigTxMetadataSchema(opts),
    projectInfo: projectInfoTxMetadataSchema,
  })
export type LaunchTxMetadata = z.infer<
  ReturnType<typeof getLaunchTxMetadataSchema>
>

export type LaunchTxMetadataSchema = ReturnType<
  typeof getLaunchTxMetadataSchema
>
