import {mConStr0, type Unit} from '@meshsdk/common'
import {deserializeDatum} from '@meshsdk/core'
import {Result} from 'better-result'
import z, {type ZodType} from 'zod'
import {ensure} from './ensure'
import {
  assetNameSchema,
  bech32AddressToMeshData,
  createUnit,
  maybeToMeshData,
  policyIdSchema,
  pubKeyHashSchema,
  scriptHashSchema,
} from './helpers'
import type {Dex} from './types'

export type RefScriptCarrierDatum = {
  ownerPubKeyHash: string
  // POSIXTime
  deadline: number
}

export const refScriptCarrierDatumToMeshData = (datum: RefScriptCarrierDatum) =>
  mConStr0([datum.ownerPubKeyHash, datum.deadline])

export type NodeKey = {
  hash: string
  index: number
}

const nodeKeyToMeshData = (key: NodeKey) => mConStr0([key.hash, key.index])

// Maybe<pair<pubkeyhash, integer>>
export const maybeNodeKeyToMeshData = (maybeKey: NodeKey | null) =>
  maybeToMeshData(maybeKey, nodeKeyToMeshData)

export type NodeDatum = {
  key: NodeKey | null
  next: NodeKey | null
  // POSIXTime
  createdTime: number
  committed: number
}

export const nodeDatumToMeshData = (datum: NodeDatum) =>
  mConStr0([
    maybeNodeKeyToMeshData(datum.key),
    maybeNodeKeyToMeshData(datum.next),
    datum.createdTime,
    datum.committed,
  ])

export type TokensHolderFirstDatum = {
  nodeValidatorHash: string
}

export const tokensHolderFirstDatumToMeshData = (
  datum: TokensHolderFirstDatum,
) => datum.nodeValidatorHash

export type CommitFoldDatum = {
  nodeScriptHash: string
  next: NodeKey | null
  committed: number
  cutoffKey: NodeKey | null
  cutoffTime: number | null
  overcommitted: number
  nodeCount: number
  owner: string // Bech32 address
}

export const commitFoldDatumToMeshData = (datum: CommitFoldDatum) =>
  mConStr0([
    datum.nodeScriptHash,
    maybeNodeKeyToMeshData(datum.next),
    datum.committed,
    maybeNodeKeyToMeshData(datum.cutoffKey),
    maybeToMeshData(datum.cutoffTime, (t) => t),
    datum.overcommitted,
    datum.nodeCount,
    bech32AddressToMeshData(datum.owner),
  ])

export type RewardsFoldDatum = {
  nodeScriptHash: string
  next: NodeKey | null
  cutoffKey: NodeKey | null
  cutoffTime: number | null
  committed: number
  overcommitted: number
  commitFoldOwner: string
}

export const rewardsFoldDatumToMeshData = (datum: RewardsFoldDatum) =>
  mConStr0([
    datum.nodeScriptHash,
    maybeNodeKeyToMeshData(datum.next),
    maybeNodeKeyToMeshData(datum.cutoffKey),
    maybeToMeshData(datum.cutoffTime, (t) => t),
    datum.committed,
    datum.overcommitted,
    datum.commitFoldOwner,
  ])

export type RewardsHolderDatum = {
  owner: NodeKey
  projectSymbol: string
  projectToken: string
  raisingSymbol: string
  raisingToken: string
}

export const rewardsHolderDatumToMeshData = (datum: RewardsHolderDatum) =>
  mConStr0([
    mConStr0([datum.owner.hash, datum.owner.index]),
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
  ])

export type PoolProofDatum = {
  projectSymbol: string
  projectToken: string
  raisingSymbol: string
  raisingToken: string
  dex: Dex
}

export const poolProofDatumToMeshData = (datum: PoolProofDatum) =>
  mConStr0([
    datum.projectSymbol,
    datum.projectToken,
    datum.raisingSymbol,
    datum.raisingToken,
    datum.dex === 'WingRidersV2' ? 0 : 1,
  ])

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
    (res) =>
      ({
        projectSymbol: res.fields[0].bytes,
        projectToken: res.fields[1].bytes,
        raisingSymbol: res.fields[2].bytes,
        raisingToken: res.fields[3].bytes,
        dex:
          res.fields[4].int === 0n
            ? ('WingRidersV2' as Dex)
            : ('SundaeSwapV3' as Dex),
      }) as PoolProofDatum,
  )

export const decodeDatum = <T extends ZodType>(
  cborSchema: T,
  datumCbor: string,
): z.core.output<T> | null =>
  Result.try(() => {
    // NOTE: throws on invalid cbor
    const datum = deserializeDatum(datumCbor)
    const parsed = cborSchema.parse(datum)
    return parsed
  }).unwrapOr(null)

export type FailProofDatum = {
  scriptHash: string
}

export const failProofDatumToMeshData = (datum: FailProofDatum) =>
  datum.scriptHash

export const failProofDatumCborSchema = z
  .object({
    bytes: scriptHashSchema,
  })
  .transform((res) => ({scriptHash: res.bytes}) as FailProofDatum)

export type WrPoolDatum = {
  requestValidatorHash: string
  assetASymbol: string
  assetAToken: string
  assetBSymbol: string
  assetBToken: string
  swapFeeInBasis: number
  protocolFeeInBasis: number
  projectFeeInBasis: number
  reserveFeeInBasis: number
  feeBasis: number
  agentFeeAda: number
  lastInteraction: number
  treasuryA: number
  treasuryB: number
  projectTreasuryA: number
  projectTreasuryB: number
  reserveTreasuryA: number
  reserveTreasuryB: number
  projectBeneficiary: string | null
  reserveBeneficiary: string | null
}

const maybeCborSchema = <T extends ZodType>(inner: T) =>
  z.union([
    z.object({
      constructor: z.literal(0n),
      fields: z.tuple([inner]),
    }),
    z.object({
      constructor: z.literal(1n),
      fields: z.tuple([]),
    }),
  ])

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
      maybeCborSchema(z.object({bytes: pubKeyHashSchema})),
      // reserveBeneficiary
      maybeCborSchema(z.object({bytes: pubKeyHashSchema})),
      // unused
      z.object({constructor: z.literal(0n), fields: z.tuple([])}),
    ]),
  })
  .transform(
    (res) =>
      ({
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
        projectBeneficiary:
          res.fields[18].constructor === 0n
            ? res.fields[18].fields[0].bytes
            : null,
        reserveBeneficiary:
          res.fields[19].constructor === 0n
            ? res.fields[19].fields[0].bytes
            : null,
      }) as WrPoolDatum,
  )

export type MultisigScript =
  | {type: 'MultisigSignature'; value: string}
  | {type: 'MultisigAllOf'; value: MultisigScript[]}
  | {type: 'MultisigAnyOf'; value: MultisigScript[]}
  | {type: 'MultisigAtLeast'; value: [number, MultisigScript[]]}
  | {type: 'MultisigBefore'; value: number}
  | {type: 'MultisigAfter'; value: number}
  | {type: 'MultisigScript'; value: string}

// I'm actually not sure anymore if this and launchpad-contracts representation is correct
const multisigScriptSchema = z.union([
  // signature
  z.object({
    constructor: z.literal(0n),
    fields: z.tuple([z.object({bytes: scriptHashSchema})]),
  }),
  // all of
  z.object({
    constructor: z.literal(1n),
    // Recursive zod schemas look weird
    get fields() {
      return z.tuple([z.array(multisigScriptSchema)])
    },
  }),
  // any of
  z.object({
    constructor: z.literal(2n),
    get fields() {
      return z.tuple([z.array(multisigScriptSchema)])
    },
  }),
  // at least
  z.object({
    constructor: z.literal(3n),
    get fields() {
      return z.tuple([
        z.object({int: z.bigint()}),
        z.array(multisigScriptSchema),
      ])
    },
  }),
  // before
  z.object({
    constructor: z.literal(4n),
    fields: z.tuple([z.object({int: z.bigint()})]),
  }),
  // after
  z.object({
    constructor: z.literal(5n),
    fields: z.tuple([z.object({int: z.bigint()})]),
  }),
  // script
  z.object({
    constructor: z.literal(6n),
    fields: z.tuple([z.object({bytes: scriptHashSchema})]),
  }),
])

const parsedSchemaToMultisigScript = (
  res: z.infer<typeof multisigScriptSchema>,
): MultisigScript => {
  switch (res.constructor) {
    case 0n:
      return {type: 'MultisigSignature', value: res.fields[0].bytes}
    case 1n:
      return {
        type: 'MultisigAllOf',
        value: res.fields[0].map(parsedSchemaToMultisigScript),
      }
    case 2n:
      return {
        type: 'MultisigAnyOf',
        value: res.fields[0].map(parsedSchemaToMultisigScript),
      }
    case 3n:
      return {
        type: 'MultisigAtLeast',
        value: [
          Number(res.fields[0].int),
          res.fields[1].map(parsedSchemaToMultisigScript),
        ],
      }
    case 4n:
      return {type: 'MultisigBefore', value: Number(res.fields[0].int)}
    case 5n:
      return {type: 'MultisigAfter', value: Number(res.fields[0].int)}
    case 6n:
      return {type: 'MultisigScript', value: res.fields[0].bytes}
    default: {
      const _: never = res
      ensure(false, 'Unreachable')
    }
  }
}

export type SundaePoolDatum = {
  identifier: string
  assetA: Unit
  assetB: Unit
  circulatingLp: number
  bidFeesPer10Thousand: number
  askFeesPer10Thousand: number
  feeManager: MultisigScript | null
  marketOpen: number
  protocolFees: number
}

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
      maybeCborSchema(multisigScriptSchema),
      // marketOpen
      z.object({int: z.bigint()}),
      // protocolFees
      z.object({int: z.bigint()}),
    ]),
  })
  .transform(
    (res) =>
      ({
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
        feeManager:
          res.fields[5].constructor === 0n
            ? parsedSchemaToMultisigScript(res.fields[5].fields[0])
            : null,
        marketOpen: Number(res.fields[6].int),
        protocolFees: Number(res.fields[7].int),
      }) as SundaePoolDatum,
  )
