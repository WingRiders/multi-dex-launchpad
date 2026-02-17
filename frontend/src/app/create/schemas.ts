import {POLICY_ID_LENGTH} from '@meshsdk/core'
import {
  MAX_LENGTHS,
  SPLIT_BPS_BASE,
} from '@wingriders/multi-dex-launchpad-common'
import {isAfter} from 'date-fns'
import {compact} from 'es-toolkit'
import z from 'zod'
import {SUPPORTED_RAISING_TOKENS_UNITS} from './constants'

export const MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE = 1

const emptyStringToUndefined = <S extends z.ZodTypeAny>(schema: S) =>
  z.union([schema, z.literal('')]).transform((value) => {
    if (typeof value === 'string' && value.trim() === '') return undefined
    return value
  })

export const projectInformationSchema = z.object({
  title: z
    .string()
    .min(1, 'Enter a launch title')
    .max(
      MAX_LENGTHS.title,
      `Use up to ${MAX_LENGTHS.title} characters for the launch title`,
    ),
  description: z
    .string()
    .min(1, 'Enter a description')
    .max(
      MAX_LENGTHS.description,
      `Use up to ${MAX_LENGTHS.description} characters for the description`,
    ),
  url: z
    .url({
      protocol: /^https$/,
      error: 'Enter a valid project link (must start with https://)',
    })
    .max(
      MAX_LENGTHS.url,
      `Use up to ${MAX_LENGTHS.url} characters for the project link`,
    ),
  tokenomicsUrl: z
    .url({
      protocol: /^https$/,
      error: 'Enter a valid tokenomics link (must start with https://)',
    })
    .max(
      MAX_LENGTHS.url,
      `Use up to ${MAX_LENGTHS.url} characters for the tokenomics link`,
    ),
  whitepaperUrl: emptyStringToUndefined(
    z
      .url({
        protocol: /^https$/,
        error: 'Enter a valid whitepaper link (must start with https://)',
      })
      .max(
        MAX_LENGTHS.url,
        `Use up to ${MAX_LENGTHS.url} characters for the whitepaper link`,
      ),
  ).optional(),
  termsAndConditionsUrl: emptyStringToUndefined(
    z
      .url({
        protocol: /^https$/,
        error:
          'Enter a valid terms and conditions link (must start with https://)',
      })
      .max(
        MAX_LENGTHS.url,
        `Use up to ${MAX_LENGTHS.url} characters for the terms and conditions link`,
      ),
  ).optional(),
  additionalUrl: emptyStringToUndefined(
    z
      .url({
        protocol: /^https$/,
        error: 'Enter a valid additional link (must start with https://)',
      })
      .max(
        MAX_LENGTHS.url,
        `Use up to ${MAX_LENGTHS.url} characters for the additional link`,
      ),
  ).optional(),
  logoUrl: z
    .string()
    .startsWith('ipfs://', 'Enter a valid IPFS link (must start with ipfs://)')
    .max(
      MAX_LENGTHS.logoUrl,
      `Use up to ${MAX_LENGTHS.logoUrl} characters for the logo link`,
    ),
})

export type ProjectInformation = z.infer<typeof projectInformationSchema>

export const tokenInformationSchema = z
  .object({
    projectTokenToSale: z.object({
      unit: z.string(),
      quantity: z.bigint(),
    }),
  })
  .refine(
    ({projectTokenToSale}) =>
      projectTokenToSale.unit != null && projectTokenToSale.quantity != null,
    {
      path: ['assetInputValue'],
      error: 'Select a project token and enter a quantity for sale',
    },
  )

export type TokenInformation = z.infer<typeof tokenInformationSchema>

export const specificationSchema = z
  .object({
    raisingTokenUnit: z.enum(
      SUPPORTED_RAISING_TOKENS_UNITS,
      'Select a token to be raised',
    ),
    projectMinCommitment: z
      .bigint({error: 'Enter minimum amount to raise'})
      .gt(0n, 'Minimum amount to raise must be greater than 0'),
    projectMaxCommitment: z
      .bigint()
      .gt(0n, 'Maximum amount to raise must be greater than 0')
      .nullable(),
    raisedTokensPoolPartPercentage: z
      .int()
      .min(
        MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE,
        `Select a percentage that is at least ${MIN_RAISED_TOKENS_POOL_PART_PERCENTAGE}%`,
      )
      .max(100),
    projectTokensToPool: z
      .bigint({
        error:
          'Enter the number of project tokens to commit to liquidity pool(s)',
      })
      .gt(
        0n,
        'Project tokens committed to liquidity pool(s) must be greater than 0',
      ),
    splitBps: z.int().min(0).max(SPLIT_BPS_BASE),
  })
  .refine(
    ({projectMinCommitment, projectMaxCommitment}) =>
      projectMaxCommitment == null ||
      projectMaxCommitment >= projectMinCommitment,
    {
      path: ['projectMaxCommitment'],
      error:
        'Maximum amount to raise must be greater than or equal to minimum amount to raise',
    },
  )

export type Specification = z.infer<typeof specificationSchema>

const baseTierSchema = z
  .object({
    startTime: z
      .date()
      .min(new Date(), 'Start time for the tier must be in the future'),
    minCommitment: z
      .bigint({error: 'Enter minimum commitment'})
      .min(0n, 'Minimum commitment must be greater than 0'),
    maxCommitment: z
      .bigint()
      .gt(0n, 'Maximum commitment must be greater than 0')
      .nullable(),
  })
  .refine(
    ({minCommitment, maxCommitment}) =>
      maxCommitment == null || maxCommitment >= minCommitment,
    {
      path: ['maxCommitment'],
      error:
        'Maximum commitment must be greater than or equal to minimum commitment',
    },
  )

export const userAccessSchema = z
  .object({
    defaultTier: baseTierSchema.optional(),
    presaleTier: baseTierSchema
      .safeExtend({
        nftPolicyId: z
          .string({
            error: 'Enter a policy ID of the tier NFT',
          })
          .regex(
            /^([0-9a-fA-F]{2})*$/,
            'Enter a valid policy ID of the tier NFT (must be a hex string)',
          )
          .length(
            POLICY_ID_LENGTH,
            `Enter a valid policy ID of the tier NFT (must be ${POLICY_ID_LENGTH} characters long)`,
          ),
      })
      .optional(),
    endTime: z.date(),
  })
  .refine(
    ({defaultTier, presaleTier}) => defaultTier != null || presaleTier != null,
    {
      error:
        'Your token launch must have at least one tier. Add either a public tier or a presale tier.',
    },
  )
  .refine(
    ({defaultTier, presaleTier, endTime}) =>
      compact([defaultTier?.startTime, presaleTier?.startTime]).every(
        (tierStartTime) => isAfter(endTime, tierStartTime),
      ),
    {
      path: ['endTime'],
      error: 'End time must be after the start time of all tiers',
    },
  )

export type UserAccess = z.infer<typeof userAccessSchema>
