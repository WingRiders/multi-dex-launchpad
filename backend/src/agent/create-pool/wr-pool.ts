import type {Unit} from '@meshsdk/common'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  calculateTxValidityInterval,
  createUnit,
  decodeDatum,
  ensure,
  isLovelaceUnit,
  LOVELACE_UNIT,
  networkToNetworkId,
  tokensHolderFinalRedeemerToMeshData,
  vestingDatumToMeshData,
  WR_POOL_OIL,
  wrFactoryDatumCborSchema,
  wrFactoryDatumToMeshData,
  wrFactoryMintRedeemerToMeshData,
  wrFactoryRedeemerToMeshData,
  wrPoolDatumToMeshDate,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import type {Launch, TxOutput} from '../../../prisma/generated/client'
import {slotToTime} from '../../common'
import {config} from '../../config'
import {prismaTxOutputToMeshOutput} from '../../db/helpers'
import {txOutputToRefScriptUtxo} from '../../endpoints/ref-scripts'
import {blake2b256} from '../../helpers/hash'
import {logger} from '../../logger'
import {poolRefScriptsByNetwork} from '../../ref-scripts'
import {
  compareHexStrings,
  getMeshBuilderBodyForLogging,
  sqrtBigInt,
} from '../helpers'
import {ogmiosUtxoToMeshUtxo} from '../ogmios/helpers'
import {getUtxos} from '../ogmios/ledger-state-query'
import {submitTx} from '../ogmios/tx-submission-client'
import {setFetcherUtxos} from '../providers'
import {buildTx, makeBuilder} from '../transactions'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  getWalletPubKeyHash,
} from '../wallet'

export const createWrPoolIfNeeded = async (
  launch: Launch,
  finalProjectTokensHolderTxOutput: TxOutput,
  finalProjectTokensHolderValidatorRefScriptCarrier: TxOutput,
) => {
  const launchTxHash = launch.txHash
  const raisingIsB =
    (compareHexStrings(
      launch.raisingTokenPolicyId,
      launch.projectTokenPolicyId,
    ) ||
      compareHexStrings(
        launch.raisingTokenAssetName,
        launch.projectTokenAssetName,
      )) > 0
  const tokenAPolicyId = raisingIsB
    ? launch.projectTokenPolicyId
    : launch.raisingTokenPolicyId
  const tokenAAssetName = raisingIsB
    ? launch.projectTokenAssetName
    : launch.raisingTokenAssetName
  const tokenBPolicyId = raisingIsB
    ? launch.raisingTokenPolicyId
    : launch.projectTokenPolicyId
  const tokenBAssetName = raisingIsB
    ? launch.raisingTokenAssetName
    : launch.projectTokenAssetName
  const poolShareAssetName = getPoolShareAssetName(
    createUnit(tokenAPolicyId, tokenAAssetName),
    createUnit(tokenBPolicyId, tokenBAssetName),
  )
  const poolShareUnit = createUnit(
    launch.wrPoolCurrencySymbol,
    poolShareAssetName,
  )

  const factoryValidityAssetName = '46' // F
  const factoryValidityUnit = createUnit(
    launch.wrPoolCurrencySymbol,
    factoryValidityAssetName,
  )
  const factoryAddress = scriptHashToBech32(
    launch.wrFactoryValidatorHash,
    undefined,
    networkToNetworkId[config.NETWORK],
  )
  const factoryUtxos = (await getUtxos([factoryAddress]))
    .map(ogmiosUtxoToMeshUtxo)
    .filter(({output}) =>
      output.amount.some(
        ({unit, quantity}) =>
          unit === factoryValidityUnit && BigInt(quantity) > 0n,
      ),
    )
  const factoryUtxosWithDecodedDatum = factoryUtxos.map((utxo) => {
    ensure(
      utxo.output.plutusData != null,
      {launchTxHash, utxo},
      'Factory datum should be present',
    )
    const wrFactoryDatum = decodeDatum(
      wrFactoryDatumCborSchema,
      utxo.output.plutusData,
    )
    ensure(
      wrFactoryDatum != null,
      {launchTxHash, utxo},
      'Factory datum should be valid',
    )
    return {utxo, wrFactoryDatum}
  })
  const suitableFactoryUtxos = factoryUtxosWithDecodedDatum.filter(
    ({wrFactoryDatum}) => {
      return (
        wrFactoryDatum.poolRangeFrom < poolShareAssetName &&
        poolShareAssetName < wrFactoryDatum.poolRangeTo
      )
    },
  )
  ensure(
    suitableFactoryUtxos.length < 2,
    {
      launchTxHash,
      suitableFactories: suitableFactoryUtxos.length,
      suitableFactoryUtxos,
      poolShareAssetName,
    },
    'There should be max 1 suitable factory',
  )
  const factoryUtxoWithDatum = suitableFactoryUtxos[0]
  if (factoryUtxoWithDatum == null) {
    logger.info({}, 'No suitable factory, pool exists.')
    // TODO Fail flow
    return
  }

  const {utxo: factoryUtxo, wrFactoryDatum: factoryDatum} = factoryUtxoWithDatum

  const finalProjectTokensHolderUtxo = prismaTxOutputToMeshOutput(
    finalProjectTokensHolderTxOutput,
  )
  const raisingTokenUnit = createUnit(
    launch.raisingTokenPolicyId,
    launch.raisingTokenAssetName,
  )
  const projectTokenUnit = createUnit(
    launch.projectTokenPolicyId,
    launch.projectTokenAssetName,
  )
  const finalProjectTokensHolderRaisingToken =
    finalProjectTokensHolderUtxo.output.amount.find(
      ({unit}) => unit === raisingTokenUnit,
    )
  ensure(
    finalProjectTokensHolderRaisingToken != null,
    {launchTxHash, finalProjectTokensHolderUtxo},
    'finalProjectTokensHolderUtxo should contain raising token',
  )
  const numRaisedTokens = BigInt(finalProjectTokensHolderRaisingToken.quantity)
  const finalProjectTokensHolderProjectToken =
    finalProjectTokensHolderUtxo.output.amount.find(
      ({unit}) => unit === projectTokenUnit,
    )
  ensure(
    finalProjectTokensHolderProjectToken != null,
    {launchTxHash, finalProjectTokensHolderUtxo},
    'finalProjectTokensHolderUtxo should contain project token',
  )
  const numProjectTokens = BigInt(finalProjectTokensHolderProjectToken.quantity)

  const finalProjectTokensHolderValidatorRef = txOutputToRefScriptUtxo(
    finalProjectTokensHolderValidatorRefScriptCarrier,
  )

  const wallet = getWallet()

  const b = makeBuilder(getWalletChangeAddress())

  // Wallet UTxOs
  const walletUtxos = getSpendableWalletUtxos()
  b.selectUtxosFrom(walletUtxos)

  // Spend final token holder
  b.spendingPlutusScriptV2()
    .txIn(
      finalProjectTokensHolderUtxo.input.txHash,
      finalProjectTokensHolderUtxo.input.outputIndex,
      finalProjectTokensHolderUtxo.output.amount,
      finalProjectTokensHolderUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      finalProjectTokensHolderValidatorRef.input.txHash,
      finalProjectTokensHolderValidatorRef.input.outputIndex,
      finalProjectTokensHolderValidatorRef.scriptSize.toString(),
      finalProjectTokensHolderValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(tokensHolderFinalRedeemerToMeshData('normal-flow'))

  // Spend factory
  const wrFactoryValidatorRef =
    poolRefScriptsByNetwork[config.NETWORK].wrFactoryValidator
  b.spendingPlutusScriptV2()
    .txIn(
      factoryUtxo.input.txHash,
      factoryUtxo.input.outputIndex,
      factoryUtxo.output.amount,
      factoryUtxo.output.address,
      0,
    )
    .spendingTxInReference(
      wrFactoryValidatorRef.input.txHash,
      wrFactoryValidatorRef.input.outputIndex,
      wrFactoryValidatorRef.scriptSize.toString(),
      wrFactoryValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      wrFactoryRedeemerToMeshData({
        poolChoice: {
          type: 'use-constant-product',
        },
        tokenAPolicyId,
        tokenAAssetName,
        tokenBPolicyId,
        tokenBAssetName,
      }),
    )

  // Output factories
  b.txOut(factoryAddress, [
    {
      unit: factoryValidityUnit,
      quantity: '1',
    },
  ]).txOutInlineDatumValue(
    wrFactoryDatumToMeshData({
      poolRangeFrom: factoryDatum.poolRangeFrom,
      poolRangeTo: poolShareAssetName,
    }),
  )
  b.txOut(factoryAddress, [
    {
      unit: factoryValidityUnit,
      quantity: '1',
    },
  ]).txOutInlineDatumValue(
    wrFactoryDatumToMeshData({
      poolRangeFrom: poolShareAssetName,
      poolRangeTo: factoryDatum.poolRangeTo,
    }),
  )

  // Validity interval
  const {validityStartSlot, validityEndSlot} = calculateTxValidityInterval(
    config.NETWORK,
  )
  b.invalidBefore(validityStartSlot).invalidHereafter(validityEndSlot)

  // Output pool
  const poolAddress = scriptHashToBech32(
    launch.wrPoolValidatorHash,
    undefined,
    networkToNetworkId[config.NETWORK],
  )
  const poolValidityPolicyId = launch.wrPoolCurrencySymbol
  const poolValidityAssetName = '4c' // L
  const poolValidityUnit = createUnit(
    poolValidityPolicyId,
    poolValidityAssetName,
  )
  const burnedShares = 1_000n
  const poolOilIfRaisingAda = isLovelaceUnit(raisingTokenUnit)
    ? WR_POOL_OIL
    : 0n
  const maxShares = 9223372036854775807n
  // In case of raising ADA, we want launch owner to pay pool oil
  // Otherwise agent pays it
  const earnedShareTokens =
    sqrtBigInt((numRaisedTokens - poolOilIfRaisingAda) * numProjectTokens) -
    burnedShares
  b.txOut(poolAddress, [
    {
      unit: poolValidityUnit,
      quantity: '1',
    },
    {
      unit: raisingTokenUnit,
      quantity: numRaisedTokens.toString(),
    },
    {
      unit: projectTokenUnit,
      quantity: numProjectTokens.toString(),
    },
    {
      unit: poolShareUnit,
      quantity: (maxShares - burnedShares - earnedShareTokens).toString(),
    },
    ...(isLovelaceUnit(raisingTokenUnit)
      ? [] // Raising ada, pool oil is paid by owner (from numRaisedTokens)
      : [
          {
            // Raising non-ada, pool oil is paid by agent
            unit: LOVELACE_UNIT,
            quantity: WR_POOL_OIL.toString(),
          },
        ]),
  ]).txOutInlineDatumValue(
    wrPoolDatumToMeshDate({
      requestValidatorHash: {
        mainnet: 'c134d839a64a5dfb9b155869ef3f34280751a622f69958baa8ffd29c',
        preprod: 'c25f7962dcbb4f0837de40ab625f5df72a01f23a61eb4021ba6e8ad0',
      }[config.NETWORK],
      assetASymbol: tokenAPolicyId,
      assetAToken: tokenAAssetName,
      assetBSymbol: tokenBPolicyId,
      assetBToken: tokenBAssetName,
      swapFeeInBasis: 30,
      protocolFeeInBasis: 5,
      projectFeeInBasis: 0,
      reserveFeeInBasis: 0,
      feeBasis: 10_000,
      agentFeeAda: 2_000_000,
      lastInteraction: slotToTime(validityStartSlot),
      treasuryA: 0,
      treasuryB: 0,
      projectTreasuryA: 0,
      projectTreasuryB: 0,
      reserveTreasuryA: 0,
      reserveTreasuryB: 0,
      projectBeneficiary: null,
      reserveBeneficiary: null,
    }),
  )

  // Mint tokens with the same policyId:
  //  1 factory token
  //  1 pool validity token
  //  LP tokens
  const wrPoolTokensPolicyRef =
    poolRefScriptsByNetwork[config.NETWORK].wrPoolTokensPolicy
  const wrPoolTokensPolicyId = wrPoolTokensPolicyRef.output.scriptHash
  ensure(
    launch.wrPoolCurrencySymbol === wrPoolTokensPolicyId,
    {
      launchTxHash,
      launch,
      wrPoolTokensPolicyId,
    },
    'WR pool tokens policy should match the launch config',
  )
  for (const {quantity, assetName} of [
    {quantity: '1', assetName: factoryValidityAssetName},
    {quantity: '1', assetName: poolValidityAssetName},
    {
      quantity: (maxShares - burnedShares).toString(),
      assetName: poolShareAssetName,
    },
  ]) {
    b.mintPlutusScriptV2()
      .mint(quantity, wrPoolTokensPolicyId, assetName)
      .mintTxInReference(
        wrPoolTokensPolicyRef.input.txHash,
        wrPoolTokensPolicyRef.input.outputIndex,
        wrPoolTokensPolicyRef.scriptSize.toString(),
        wrPoolTokensPolicyRef.output.scriptHash,
      )
      .mintRedeemerValue(wrFactoryMintRedeemerToMeshData('mint-new-pool'))
  }

  // Vesting output
  const vestingAddress = scriptHashToBech32(
    launch.vestingValidatorHash,
    undefined,
    networkToNetworkId[config.NETWORK],
  )
  b.txOut(vestingAddress, [
    {
      unit: poolShareUnit,
      quantity: earnedShareTokens.toString(),
    },
  ]).txOutInlineDatumValue(
    vestingDatumToMeshData({
      beneficiary: launch.ownerBech32Address,
      vestingSymbol: launch.wrPoolCurrencySymbol,
      vestingToken: poolShareAssetName,
      totalVestingQty: earnedShareTokens,
      vestingPeriodStart: Number(launch.vestingPeriodStart),
      vestingPeriodEnd: Number(
        launch.vestingPeriodStart + launch.vestingPeriodDuration,
      ),
      firstUnlockPossibleAfter: Number(
        launch.vestingPeriodStart + launch.vestingPeriodDurationToFirstUnlock,
      ),
      totalInstallments: launch.vestingPeriodInstallments,
      vestingMemo: 'multi-dex-launchpad',
    }),
  )

  setFetcherUtxos([
    ...walletUtxos,
    finalProjectTokensHolderUtxo,
    finalProjectTokensHolderValidatorRef,
    factoryUtxo,
    wrFactoryValidatorRef,
    wrPoolTokensPolicyRef,
  ])

  // Collateral
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')

  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )

  b.requiredSignerHash(getWalletPubKeyHash())

  const unsignedTx = await buildTx(b)
  if (unsignedTx.isErr()) {
    logger.error(
      {
        error: unsignedTx.error,
        txBuilderBody: getMeshBuilderBodyForLogging(b),
      },
      `Error when building transaction: ${unsignedTx.error.message}`,
    )
    return null
  }

  const signedTx = await wallet.signTx(unsignedTx.value)
  logger.info({launchTxHash, signedTx}, 'Submitting WR pool transaction...')
  const txHash = await Result.tryPromise(() => submitTx(signedTx))
  if (txHash.isErr()) {
    logger.error(
      {
        txBuilderBody: getMeshBuilderBodyForLogging(b),
        signedTx,
        error: txHash.error,
        cause: txHash.error.cause, // txHash.error.cause.data is omitted above
      },
      `Error when submitting transaction: ${txHash.error.message}`,
    )
    return null
  }
  logger.info(
    {launchTxHash, txHash: txHash.value},
    'Submitted WR pool transaction',
  )
  return txHash.value
}

const getUnitHash = (unit: Unit) =>
  blake2b256(Buffer.from(isLovelaceUnit(unit) ? '' : unit, 'hex'))

// Assume the units A and B are already sorted
const getPoolShareAssetName = (unitA: Unit, unitB: Unit) => {
  const bufferConcatenated = Buffer.concat([
    blake2b256(Buffer.from('0', 'utf8')), // support only CP pools
    blake2b256(Buffer.from('1', 'utf8')), // support only 1:1 scales
    blake2b256(Buffer.from('1', 'utf8')), // support only 1:1 scales
    getUnitHash(unitA),
    getUnitHash(unitB),
  ])
  return blake2b256(bufferConcatenated).toString('hex')
}
