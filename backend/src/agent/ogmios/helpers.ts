import type {
  MetadatumDetailedSchema,
  Plutus,
  Point,
  ProtocolParameters,
  Signatory,
  Utxo,
  Value,
} from '@cardano-ogmios/schema'
import type {Asset, LanguageVersion, Protocol, UTxO} from '@meshsdk/common'
import {Ed25519PublicKey, Ed25519PublicKeyHex} from '@meshsdk/core-cst'
import {
  createUnit,
  ensure,
  LOVELACE_UNIT,
} from '@wingriders/multi-dex-launchpad-common'
import {config} from '../../config'
import {encodeOgmiosScript} from '../../helpers/script'

export const ogmiosUtxoToMeshUtxo = (utxo: Utxo[number]): UTxO => {
  const script =
    utxo.script != null &&
    utxo.script.language !== 'native' &&
    utxo.script.cbor != null
      ? encodeOgmiosScript(utxo.script.language, utxo.script.cbor)
      : null
  return {
    input: {
      txHash: utxo.transaction.id,
      outputIndex: utxo.index,
    },
    output: {
      address: utxo.address,
      amount: ogmiosValueToMeshAssets(utxo.value, {
        includeAda: true,
      }),
      dataHash: utxo.datumHash,
      plutusData: utxo.datum,
      scriptRef: script?.scriptRef,
      scriptHash: script?.scriptHash,
    },
  }
}

export const originPoint = {
  mainnet: {
    // Shelley initial block
    id: 'aa83acbf5904c0edfe4d79b3689d3d00fcfc553cf360fd2229b98d464c28e9de',
    slot: 4492800,
    height: 4490511,
  },
  preprod: {
    // First launch https://preprod.cexplorer.io/tx/4aaef6b2bfc1f69f78c5f7969b3b210bf525a4aba9d8cf82069b17228bd9bbb8
    // In block https://preprod.cexplorer.io/block/ee229a9906019093b122749ceaa1f50024c11125ffc1c077c13600bb22cb10d4
    // Origin point need to be 1 block before that
    // https://preprod.cexplorer.io/block/7c095dd9e4fa0626b64d659135ba9400d6196401f5da12be562cea8f1ac5cf82
    id: '7c095dd9e4fa0626b64d659135ba9400d6196401f5da12be562cea8f1ac5cf82',
    slot: 118075031,
    height: 4518078,
  },
}[config.NETWORK]

export const tipToSlot = (tip: Point | 'origin') =>
  tip === 'origin' ? originPoint.slot : tip.slot

export const ogmiosValueToMeshAssets = (
  value: Value,
  {
    includeAda = false,
    includeZero = false,
  }: {includeAda?: boolean; includeZero?: boolean} = {},
): Asset[] =>
  Object.entries(value).flatMap(([policyId, assets]) =>
    Object.entries(assets).flatMap(([assetName, quantity]) => {
      if (policyId === 'ada' && !includeAda) return []
      if (quantity === 0n && !includeZero) return []
      return {
        unit:
          policyId === 'ada' ? LOVELACE_UNIT : createUnit(policyId, assetName),
        quantity: quantity.toString(),
      }
    }),
  )

// Returns:
// type t =
//   | bigint
//   | string
//   | t[]
//   | Record<t, t>
// The TS returns unknown because recursive type aliases are not allowed
export const parseOgmiosMetadatum = (
  metadatum: MetadatumDetailedSchema,
): unknown => {
  if ('int' in metadatum) return metadatum.int
  if ('string' in metadatum) return metadatum.string
  if ('bytes' in metadatum) return metadatum.bytes
  if ('list' in metadatum) return metadatum.list.map(parseOgmiosMetadatum)
  if ('map' in metadatum)
    return Object.fromEntries(
      metadatum.map.map(({k, v}) => [
        parseOgmiosMetadatum(k),
        parseOgmiosMetadatum(v),
      ]),
    )
  const _: never = metadatum
  ensure(false, {metadatum}, 'Unreachable metadatum')
}

export const ogmiosPlutusVersionToMeshVersion: Record<
  Plutus['language'],
  LanguageVersion
> = {
  'plutus:v1': 'V1',
  'plutus:v2': 'V2',
  'plutus:v3': 'V3',
}

// Mesh protocol parameters are only a subset, probably only those which can be changed between epochs.
export const ogmiosProtocolParametersToMeshProtocolParameters = (
  params: ProtocolParameters,
  epoch: number,
): Protocol => ({
  epoch,
  minFeeA: params.minFeeCoefficient,
  minFeeB: Number(params.minFeeConstant.ada.lovelace),
  maxBlockSize: params.maxBlockBodySize!.bytes,
  maxTxSize: params.maxTransactionSize!.bytes,
  maxBlockHeaderSize: params.maxBlockHeaderSize!.bytes,
  keyDeposit: Number(params.stakeCredentialDeposit.ada.lovelace),
  poolDeposit: Number(params.stakePoolDeposit.ada.lovelace),
  decentralisation: 0, // All blocks are produced by SPO. This params was already dropped and is not exposed by Ogmios.
  minPoolCost: params.minStakePoolCost.ada.lovelace.toString(),
  // Yes, Mesh and Ogmios have inverted number/string types for the following:
  priceMem: Number(params.scriptExecutionPrices!.memory),
  priceStep: Number(params.scriptExecutionPrices!.cpu),
  maxTxExMem: params.maxExecutionUnitsPerTransaction!.memory.toString(),
  maxTxExSteps: params.maxExecutionUnitsPerTransaction!.cpu.toString(),
  maxBlockExMem: params.maxExecutionUnitsPerBlock!.memory.toString(),
  maxBlockExSteps: params.maxExecutionUnitsPerBlock!.cpu.toString(),
  maxValSize: params.maxValueSize!.bytes,
  collateralPercent: params.collateralPercentage!,
  maxCollateralInputs: params.maxCollateralInputs!,
  coinsPerUtxoSize: params.minUtxoDepositCoefficient,
  minFeeRefScriptCostPerByte: params.minFeeReferenceScripts!.multiplier,
})

// Ogmios exposes only paymentKey, not it's hash
export const getSignatoryKeyHash = ({key}: Signatory): string =>
  Ed25519PublicKey.fromHex(Ed25519PublicKeyHex(key)).hash().hex()
