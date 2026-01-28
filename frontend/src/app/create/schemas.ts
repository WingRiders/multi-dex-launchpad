import {
  MAX_LENGTHS,
  SPLIT_BPS_BASE,
} from '@wingriders/multi-dex-launchpad-common'
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
      .bigint()
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
