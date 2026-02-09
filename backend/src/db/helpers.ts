import type {Plutus, TransactionOutput, Value} from '@cardano-ogmios/schema'
import type {UTxO} from '@meshsdk/common'
import type {InputJsonValue} from '@prisma/client/runtime/client'
import {
  createUnit,
  ensure,
  type LaunchpadConfig,
} from '@wingriders/multi-dex-launchpad-common'
import superjson, {type SuperJSONResult} from 'superjson'
import type {SetNonNullable} from 'type-fest'
import type {Launch, TxOutput} from '../../prisma/generated/client'
import type {TxOutputCreateManyInput} from '../../prisma/generated/models/TxOutput'
import {ogmiosValueToMeshAssets} from '../agent/ogmios/helpers'
import {encodeOgmiosScript} from '../helpers/script'
import {prisma} from './prisma-client'

export const prismaLaunchToLaunchConfig = (
  launch: Launch,
): LaunchpadConfig => ({
  ownerBech32Address: launch.ownerBech32Address,
  splitBps: launch.splitBps,
  wrPoolValidatorHash: launch.wrPoolValidatorHash,
  wrFactoryValidatorHash: launch.wrFactoryValidatorHash,
  wrPoolCurrencySymbol: launch.wrPoolCurrencySymbol,
  sundaePoolScriptHash: launch.sundaePoolScriptHash,
  sundaeFeeTolerance: launch.sundaeFeeTolerance,
  sundaeSettingsCurrencySymbol: launch.sundaeSettingsCurrencySymbol,
  startTime: Number(launch.startTime),
  endTime: Number(launch.endTime),
  projectToken: createUnit(
    launch.projectTokenPolicyId,
    launch.projectTokenAssetName,
  ),
  raisingToken: createUnit(
    launch.raisingTokenPolicyId,
    launch.raisingTokenAssetName,
  ),
  projectMinCommitment: launch.projectMinCommitment,
  projectMaxCommitment: launch.projectMaxCommitment,
  totalTokens: launch.totalTokens,
  tokensToDistribute: launch.tokensToDistribute,
  raisedTokensPoolPartPercentage: launch.raisedTokensPoolPartPercentage,
  daoFeeNumerator: BigInt(launch.daoFeeNumerator),
  daoFeeDenominator: BigInt(launch.daoFeeDenominator),
  daoFeeReceiverBech32Address: launch.daoFeeReceiverBech32Address,
  daoAdminPubKeyHash: launch.daoAdminPubKeyHash,
  collateral: launch.collateral,
  starter: {
    txHash: launch.starterTxHash,
    outputIndex: Number(launch.starterOutputIndex),
  },
  vestingPeriodDuration: launch.vestingPeriodDuration,
  vestingPeriodDurationToFirstUnlock: launch.vestingPeriodDurationToFirstUnlock,
  vestingPeriodInstallments: BigInt(launch.vestingPeriodInstallments),
  vestingPeriodStart: Number(launch.vestingPeriodStart),
  vestingValidatorHash: launch.vestingValidatorHash,
  presaleTierCs: launch.presaleTierCs,
  presaleTierStartTime: Number(launch.presaleTierStartTime),
  defaultStartTime: Number(launch.defaultStartTime),
  presaleTierMinCommitment: launch.presaleTierMinCommitment,
  defaultTierMinCommitment: launch.defaultTierMinCommitment,
  presaleTierMaxCommitment: launch.presaleTierMaxCommitment,
  defaultTierMaxCommitment: launch.defaultTierMaxCommitment,
  nodeAda: launch.nodeAda,
  commitFoldFeeAda: launch.commitFoldFeeAda,
  oilAda: launch.oilAda,
})

export const serializeValue = (value: Value): InputJsonValue =>
  // trust me
  superjson.serialize(value) as object as InputJsonValue

export const prismaTxOutputToMeshOutput = (output: TxOutput): UTxO => {
  // TODO: ensure the shape
  const value: Value = superjson.deserialize(
    output.value as unknown as SuperJSONResult,
  )

  const script =
    output.scriptLanguage != null &&
    output.scriptLanguage !== 'native' &&
    output.scriptCbor != null
      ? encodeOgmiosScript(
          output.scriptLanguage as Plutus['language'],
          output.scriptCbor,
        )
      : null

  return {
    input: {
      txHash: output.txHash,
      outputIndex: output.outputIndex,
    },
    output: {
      address: output.address,
      amount: ogmiosValueToMeshAssets(value, {
        includeAda: true,
      }),
      dataHash: output.datumHash ?? undefined,
      plutusData: output.datum ?? undefined,
      ...(script != null
        ? {scriptRef: script.scriptRef, scriptHash: script.scriptHash}
        : {}),
    },
  }
}

type FindNodeToSpendArgs = {
  launchTxHash: string
  ownerPubKeyHash: string
}

export const findNodeToSpend = async ({
  launchTxHash,
  ownerPubKeyHash,
}: FindNodeToSpendArgs) => {
  const nodeToSpend = await prisma.node.findFirstOrThrow({
    where: {
      launchTxHash,
      txOut: {
        spentSlot: null,
      },
      OR: [
        {keyHash: null},
        {
          keyHash: {
            lte: ownerPubKeyHash,
          },
        },
      ],
    },
    orderBy: [
      {keyHash: {sort: 'desc', nulls: 'last'}},
      {keyIndex: {sort: 'desc', nulls: 'last'}},
    ],
    include: {
      txOut: true,
    },
  })

  return prismaTxOutputToMeshOutput(nodeToSpend.txOut)
}

export const makePrismaTxOutput = (
  slot: number,
  txHash: string,
  outputIndex: number,
  txOutput: TransactionOutput,
): SetNonNullable<Required<TxOutputCreateManyInput>, 'datum'> => {
  ensure(
    txOutput.datum != null,
    {txHash, outputIndex},
    'Tx output must have datum',
  )

  return {
    txHash,
    slot,
    outputIndex,
    spentTxHash: null,
    spentSlot: null,
    address: txOutput.address,
    datum: txOutput.datum,
    datumHash: txOutput.datumHash ?? null,
    value: serializeValue(txOutput.value) as InputJsonValue,
    scriptLanguage: txOutput.script?.language ?? null,
    scriptCbor: txOutput.script?.cbor ?? null,
  }
}
