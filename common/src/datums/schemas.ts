import z from 'zod'
import {createUnit, getAddressSchema, type Network} from '../helpers'
import {
  assetNameSchema,
  hexStringSchema,
  makeMaybeCborSchema,
  policyIdSchema,
  pubKeyHashSchema,
  scriptHashSchema,
} from '../helpers/schemas'
import type {Dex} from '../types'
import type {
  AddressCredential,
  CommitFoldDatum,
  FailProofDatum,
  MultisigScript,
  NodeDatum,
  NodeKey,
  PoolProofDatum,
  Rational,
  RefScriptCarrierDatum,
  RewardsFoldDatum,
  RewardsHolderDatum,
  SundaePoolDatum,
  SundaeSettingsDatum,
  WrFactoryDatum,
  WrPoolDatum,
} from './types'

export const nodeKeyCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      z.union([
        // user nodes have full pub key hash here
        z.object({bytes: pubKeyHashSchema}),
        // separator nodes are 1 byte only => 2 hex characters
        z.object({bytes: hexStringSchema.length(2)}),
      ]),
      z.object({int: z.bigint()}),
    ]),
  })
  .transform(
    (res): NodeKey => ({
      hash: res.fields[0].bytes,
      index: Number(res.fields[1].int),
    }),
  )

export const maybeNodeKeyCborSchema = makeMaybeCborSchema(nodeKeyCborSchema)

export const nodeDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      maybeNodeKeyCborSchema,
      maybeNodeKeyCborSchema,
      z.object({int: z.bigint()}), // createdTime
      z.object({int: z.bigint()}), // committed
    ]),
  })
  .transform(
    (res): NodeDatum => ({
      key: res.fields[0],
      next: res.fields[1],
      createdTime: Number(res.fields[2].int),
      committed: res.fields[3].int,
    }),
  )

export const getCommitFoldDatumCborSchema = (network: Network) =>
  z
    .object({
      constructor: z.literal(0n),
      fields: z.tuple([
        z.object({bytes: scriptHashSchema}),
        maybeNodeKeyCborSchema,
        z.object({int: z.bigint()}),
        maybeNodeKeyCborSchema,
        makeMaybeCborSchema(z.object({int: z.bigint()})),
        z.object({int: z.bigint()}),
        z.object({int: z.bigint()}),
        getAddressSchema(network),
      ]),
    })
    .transform(
      (res): CommitFoldDatum => ({
        nodeScriptHash: res.fields[0].bytes,
        next: res.fields[1],
        committed: res.fields[2].int,
        cutoffKey: res.fields[3],
        cutoffTime: (res.fields[4] && Number(res.fields[4].int)) ?? null,
        overcommitted: res.fields[5].int,
        nodeCount: Number(res.fields[6].int),
        owner: res.fields[7],
      }),
    )

export const getRewardsFoldDatumCborSchema = (network: Network) =>
  z
    .object({
      constructor: z.literal(0n),
      fields: z.tuple([
        z.object({bytes: scriptHashSchema}),
        maybeNodeKeyCborSchema,
        maybeNodeKeyCborSchema,
        makeMaybeCborSchema(z.object({int: z.bigint()})),
        z.object({int: z.bigint()}),
        z.object({int: z.bigint()}),
        getAddressSchema(network),
      ]),
    })
    .transform(
      (res): RewardsFoldDatum => ({
        nodeScriptHash: res.fields[0].bytes,
        next: res.fields[1],
        cutoffKey: res.fields[2],
        cutoffTime: (res.fields[3] && Number(res.fields[3].int)) ?? null,
        committed: res.fields[4].int,
        overcommitted: res.fields[5].int,
        commitFoldOwner: res.fields[6],
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
      circulatingLp: res.fields[2].int,
      bidFeesPer10Thousand: Number(res.fields[3].int),
      askFeesPer10Thousand: Number(res.fields[4].int),
      feeManager: res.fields[5],
      marketOpen: Number(res.fields[6].int),
      protocolFees: Number(res.fields[7].int),
    }),
  )

export const refScriptCarrierDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      z.object({bytes: pubKeyHashSchema}), // ownerPubKeyHash
      z.object({int: z.bigint()}), // deadline
    ]),
  })
  .transform(
    (res): RefScriptCarrierDatum => ({
      ownerPubKeyHash: res.fields[0].bytes,
      deadline: Number(res.fields[1].int),
    }),
  )

export const finalProjectTokensHolderDatumCborSchema = z
  .object({
    int: z.union([z.literal(0n), z.literal(1n)]),
  })
  .transform((res): Dex => (res.int === 0n ? 'WingRidersV2' : 'SundaeSwapV3'))

export const wrFactoryDatumCborSchema = z
  .object({
    constructor: z.literal(0n),
    fields: z.tuple([
      // poolRangeFrom - either '00' or shareAssetName(64)
      z.object({bytes: hexStringSchema.max(64)}),
      // poolRangeTo - either shareAssetName(64) or 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00'
      z.object({bytes: hexStringSchema.max(66)}),
    ]),
  })
  .transform(
    (res): WrFactoryDatum => ({
      poolRangeFrom: res.fields[0].bytes,
      poolRangeTo: res.fields[1].bytes,
    }),
  ) // TODO Factory datum should be valid

// A pair in aiken: (Int, Int)
export const rationalCborSchema = z
  .object({
    list: z.tuple([z.object({int: z.bigint()}), z.object({int: z.bigint()})]),
  })
  .transform((res): Rational => [res.list[0].int, res.list[1].int])

export const verificationKeyCborSchema = z
  .object({bytes: hexStringSchema})
  .transform((res) => res.bytes)

// either a verificationKeyHash or a scriptHash
export const credentialCborSchema = z
  .union([
    z.object({
      constructor: z.literal(0n),
      fields: z.tuple([z.object({bytes: pubKeyHashSchema})]),
    }),
    z.object({
      constructor: z.literal(1n),
      fields: z.tuple([z.object({bytes: scriptHashSchema})]),
    }),
  ])
  .transform(
    (res): AddressCredential =>
      res.constructor === 0n
        ? {type: 'pubKeyHash', value: res.fields[0].bytes}
        : {type: 'scriptHash', value: res.fields[0].bytes},
  )

export const getSundaeSettingsDatumCborSchema = (network: Network) =>
  z
    .object({
      constructor: z.literal(0n),
      fields: z.tuple([
        // settings admin
        multisigScriptSchema,
        // metadata admin
        getAddressSchema(network),
        // treasury admin
        multisigScriptSchema,
        // treasury address
        getAddressSchema(network),
        // treasury allowance
        rationalCborSchema,
        // authorized scoopers
        makeMaybeCborSchema(
          z.object({
            list: z.array(verificationKeyCborSchema),
          }),
        ),
        // authorized staking keys
        z.object({
          list: z.array(credentialCborSchema),
        }),
        // base fee
        z.object({int: z.bigint()}),
        // simple fee
        z.object({int: z.bigint()}),
        // strategy fee
        z.object({int: z.bigint()}),
        // pool creation fee
        z.object({int: z.bigint()}),
        // extensions, pure Data onchain, we do nothing with it
        z.unknown(),
      ]),
    })
    .transform(
      (res): SundaeSettingsDatum => ({
        settingsAdmin: res.fields[0],
        metadataAdminBech32Address: res.fields[1],
        treasuryAdmin: res.fields[2],
        treasuryBech32Address: res.fields[3],
        treasuryAllowance: res.fields[4],
        authorizedScoopers: res.fields[5]?.list ?? null,
        authorizedStakingKeys: res.fields[6].list,
        baseFee: res.fields[7].int,
        simpleFee: res.fields[8].int,
        strategyFee: res.fields[9].int,
        poolCreationFee: res.fields[10].int,
        extensions: res.fields[11],
      }),
    )
