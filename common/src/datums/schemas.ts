import z from 'zod'
import {createUnit} from '../helpers'
import {
  assetNameSchema,
  makeMaybeCborSchema,
  policyIdSchema,
  pubKeyHashSchema,
  scriptHashSchema,
} from '../helpers/schemas'
import type {
  FailProofDatum,
  MultisigScript,
  NodeKey,
  PoolProofDatum,
  RewardsHolderDatum,
  SundaePoolDatum,
  WrPoolDatum,
} from './types'

export const nodeKeyCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      z.object({bytes: pubKeyHashSchema}),
      z.object({int: z.bigint()}),
    ]),
  })
  .transform(
    (res): NodeKey => ({
      hash: res.fields[0].bytes,
      index: Number(res.fields[1].int),
    }),
  )

export const rewardsHolderDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      // owner
      nodeKeyCborSchema,
      // projectSymbol
      z.object({bytes: policyIdSchema}),
      // projectToken
      z.object({bytes: assetNameSchema}),
      // raisingSymbol
      z.object({bytes: policyIdSchema}),
      // raisingToken
      z.object({bytes: assetNameSchema}),
      // usesWr
      z.object({int: z.union([z.literal(0n), z.literal(1n)])}),
      // usesSundae
      z.object({int: z.union([z.literal(0n), z.literal(1n)])}),
      // endTime
      z.object({int: z.bigint()}),
    ]),
  })
  .refine(
    (res) => res.fields[5].int === 1n || res.fields[6].int === 1n,
    'At least one of usesWr and usesSundae must be true (1 on-chain)',
  )
  .transform(
    (res): RewardsHolderDatum => ({
      owner: res.fields[0],
      projectSymbol: res.fields[1].bytes,
      projectToken: res.fields[2].bytes,
      raisingSymbol: res.fields[3].bytes,
      raisingToken: res.fields[4].bytes,
      usesWr: res.fields[5].int === 1n,
      usesSundae: res.fields[6].int === 1n,
      endTime: Number(res.fields[7].int),
    }),
  )

export const poolProofDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      z.object({bytes: policyIdSchema}),
      z.object({bytes: assetNameSchema}),
      z.object({bytes: policyIdSchema}),
      z.object({bytes: assetNameSchema}),
      z.object({int: z.union([z.literal(0n), z.literal(1n)])}),
    ]),
  })
  .transform(
    (res): PoolProofDatum => ({
      projectSymbol: res.fields[0].bytes,
      projectToken: res.fields[1].bytes,
      raisingSymbol: res.fields[2].bytes,
      raisingToken: res.fields[3].bytes,
      dex: res.fields[4].int === 0n ? 'WingRidersV2' : 'SundaeSwapV3',
    }),
  )

export const failProofDatumCborSchema = z
  .object({
    bytes: scriptHashSchema,
  })
  .transform((res): FailProofDatum => ({scriptHash: res.bytes}))

const maybePubKeyHashCborSchema = makeMaybeCborSchema(
  z.object({bytes: pubKeyHashSchema}).transform((res) => res.bytes),
)

export const wrPoolDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      // requestValidatorHash
      z.object({bytes: scriptHashSchema}),
      // assetASymbol
      z.object({bytes: policyIdSchema}),
      // assetAToken
      z.object({bytes: assetNameSchema}),
      // assetBSymbol
      z.object({bytes: policyIdSchema}),
      // assetBToken
      z.object({bytes: assetNameSchema}),
      // swapFeeInBasis
      z.object({int: z.bigint()}),
      // protocolFeeInBasis
      z.object({int: z.bigint()}),
      // projectFeeInBasis
      z.object({int: z.bigint()}),
      // reserveFeeInBasis
      z.object({int: z.bigint()}),
      // feeBasis
      z.object({int: z.bigint()}),
      // agentFeeAda
      z.object({int: z.bigint()}),
      // lastInteraction
      z.object({int: z.bigint()}),
      // treasuryA
      z.object({int: z.bigint()}),
      // treasuryB
      z.object({int: z.bigint()}),
      // projectTreasuryA
      z.object({int: z.bigint()}),
      // projectTreasuryB
      z.object({int: z.bigint()}),
      // reserveTreasuryA
      z.object({int: z.bigint()}),
      // reserveTreasuryB
      z.object({int: z.bigint()}),
      // projectBeneficiary
      maybePubKeyHashCborSchema,
      // reserveBeneficiary
      maybePubKeyHashCborSchema,
      // unused
      z.object({constructor: z.literal(0n), fields: z.tuple([])}),
    ]),
  })
  .transform(
    (res): WrPoolDatum => ({
      requestValidatorHash: res.fields[0].bytes,
      assetASymbol: res.fields[1].bytes,
      assetAToken: res.fields[2].bytes,
      assetBSymbol: res.fields[3].bytes,
      assetBToken: res.fields[4].bytes,
      swapFeeInBasis: Number(res.fields[5].int),
      protocolFeeInBasis: Number(res.fields[6].int),
      projectFeeInBasis: Number(res.fields[7].int),
      reserveFeeInBasis: Number(res.fields[8].int),
      feeBasis: Number(res.fields[9].int),
      agentFeeAda: Number(res.fields[10].int),
      lastInteraction: Number(res.fields[11].int),
      treasuryA: Number(res.fields[12].int),
      treasuryB: Number(res.fields[13].int),
      projectTreasuryA: Number(res.fields[14].int),
      projectTreasuryB: Number(res.fields[15].int),
      reserveTreasuryA: Number(res.fields[16].int),
      reserveTreasuryB: Number(res.fields[17].int),
      projectBeneficiary: res.fields[18],
      reserveBeneficiary: res.fields[19],
    }),
  )

// I'm actually not sure anymore if this and launchpad-contracts representation is correct
export const multisigScriptSchema = z
  .union([
    // Signature
    z.object({
      constructor: z.literal(0n),
      fields: z.tuple([
        z.object({
          bytes: pubKeyHashSchema,
        }), // key_hash
      ]),
    }),
    // AllOf
    z.object({
      constructor: z.literal(1n),
      fields: z.tuple([
        z.object({
          get list(): z.ZodArray<any> {
            return z.array(multisigScriptSchema)
          },
        }), // scripts
      ]),
    }),
    // AnyOf
    z.object({
      constructor: z.literal(2n),
      fields: z.tuple([
        z.object({
          get list(): z.ZodArray<any> {
            return z.array(multisigScriptSchema)
          },
        }), // scripts
      ]),
    }),
    // AtLeast
    z.object({
      constructor: z.literal(3n),
      fields: z.tuple([
        z.object({int: z.bigint()}), // required
        z.object({
          get list(): z.ZodArray<any> {
            return z.array(multisigScriptSchema)
          },
        }), // scripts
      ]),
    }),
    // Before
    z.object({
      constructor: z.literal(4n),
      fields: z.tuple([
        z.object({int: z.bigint()}), // time
      ]),
    }),
    // After
    z.object({
      constructor: z.literal(5n),
      fields: z.tuple([
        z.object({int: z.bigint()}), // time
      ]),
    }),
    // Script
    z.object({
      constructor: z.literal(6n),
      fields: z.tuple([
        z.object({
          bytes: scriptHashSchema,
        }), // script_hash
      ]),
    }),
  ])
  .transform((a): MultisigScript => {
    switch (a.constructor) {
      case 0n:
        return {
          type: 'MultisigSignature',
          keyHash: a.fields[0].bytes,
        }
      case 1n:
        return {
          type: 'MultisigAllOf',
          scripts: a.fields[0].list,
        }
      case 2n:
        return {
          type: 'MultisigAnyOf',
          scripts: a.fields[0].list,
        }
      case 3n:
        return {
          type: 'MultisigAtLeast',
          required: Number(a.fields[0].int),
          scripts: a.fields[1].list,
        }
      case 4n:
        return {
          type: 'MultisigBefore',
          time: Number(a.fields[0].int),
        }
      case 5n:
        return {
          type: 'MultisigAfter',
          time: Number(a.fields[0].int),
        }
      case 6n:
        return {
          type: 'MultisigScript',
          scriptHash: a.fields[0].bytes,
        }
      default:
        throw new Error('Invalid multisig script')
    }
  })

export const sundaePoolDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      // I think this can be a scriptHash maybe
      // identifier
      z.object({bytes: scriptHashSchema}),
      // assets
      z.object({
        list: z.tuple([
          z.object({
            list: z.tuple([
              z.object({bytes: policyIdSchema}),
              z.object({bytes: assetNameSchema}),
            ]),
          }),
          z.object({
            list: z.tuple([
              z.object({bytes: policyIdSchema}),
              z.object({bytes: assetNameSchema}),
            ]),
          }),
        ]),
      }),
      // circulatingLp
      z.object({int: z.bigint()}),
      // bidFeesPer10Thousand
      z.object({int: z.bigint()}),
      // askFeesPer10Thousand
      z.object({int: z.bigint()}),
      // feeManager
      makeMaybeCborSchema(multisigScriptSchema),
      // marketOpen
      z.object({int: z.bigint()}),
      // protocolFees
      z.object({int: z.bigint()}),
    ]),
  })
  .transform(
    (res): SundaePoolDatum => ({
      identifier: res.fields[0].bytes,
      assetA: createUnit(
        res.fields[1].list[0].list[0].bytes,
        res.fields[1].list[0].list[1].bytes,
      ),
      assetB: createUnit(
        res.fields[1].list[1].list[0].bytes,
        res.fields[1].list[1].list[1].bytes,
      ),
      circulatingLp: Number(res.fields[2].int),
      bidFeesPer10Thousand: Number(res.fields[3].int),
      askFeesPer10Thousand: Number(res.fields[4].int),
      feeManager: res.fields[5],
      marketOpen: Number(res.fields[6].int),
      protocolFees: Number(res.fields[7].int),
    }),
  )
