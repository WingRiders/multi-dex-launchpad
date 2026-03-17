import {
  type Asset,
  CIP68_100,
  CIP68_222,
  mConStr0,
  type TxInput,
  type UTxO,
} from '@meshsdk/common'
import {deserializeAddress} from '@meshsdk/core'
import {blake2b, type HexBlob, scriptHashToBech32} from '@meshsdk/core-cst'
import {
  calculateTxValidityInterval,
  createUnit,
  decodeDatum,
  ensure,
  finalProjectTokensHolderDatumCborSchema,
  getSundaeSettingsDatumCborSchema,
  getUtxoAda,
  isLovelaceUnit,
  LOVELACE_UNIT,
  networkToNetworkId,
  parseUnit,
  type RefScriptUtxo,
  SUNDAE_POOL_ASK_FEES_PER_10_THOUSAND,
  SUNDAE_POOL_BID_FEES_PER_10_THOUSAND,
  SUNDAE_POOL_SCRIPT_HASH,
  type SundaePoolDatum,
  sortUtxos,
  sundaePoolDatumToMeshData,
  sundaePoolMintRedeemerToMeshData,
  tokensHolderFinalRedeemerToMeshData,
  type VestingDatum,
  vestingDatumToMeshData,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import {maxBy} from 'es-toolkit'
import type {
  FinalProjectTokensHolder,
  Launch,
  TxOutput,
} from '../../../prisma/generated/client'
import {config} from '../../config'
import {
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../../db/helpers'
import {logger} from '../../logger'
import {poolRefScriptsByNetwork} from '../../ref-scripts'
import {getMeshBuilderBodyForLogging, sqrtBigInt} from '../helpers'
import {submitTx} from '../ogmios/tx-submission-client'
import {setFetcherUtxos} from '../providers'
import {buildTx, makeBuilder} from '../transactions'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  trackSpentInputs,
} from '../wallet'

const byteToHex = (x: number): string => x.toString(16).padStart(2, '0')

export const getSundaePoolIdentifier = (firstInput: TxInput) =>
  blake2b
    .hash(
      `${firstInput.txHash}23${byteToHex(firstInput.outputIndex)}` as HexBlob,
      32,
    )
    .slice(8)

// Returns true if the final holder is failed and must be spent to the dao fee receiver
export const createSundaePoolIfNeeded = async (
  launch: Launch,
  projectTokensHolder: FinalProjectTokensHolder & {txOut: TxOutput},
  finalProjectTokensHolderValidatorRef: RefScriptUtxo,
  sundaeSettingsUtxo: UTxO,
) => {
  const launchConfig = prismaLaunchToLaunchConfig(launch)
  const isAdaLaunch = isLovelaceUnit(launchConfig.raisingToken)

  const [raisingSymbol, raisingToken] = parseUnit(launchConfig.raisingToken)
  const [projectSymbol, projectToken] = parseUnit(launchConfig.projectToken)

  const [[assetASymbol, assetAToken], [assetBSymbol, assetBToken]] =
    raisingSymbol === projectSymbol
      ? raisingToken < projectToken
        ? [
            [raisingSymbol, raisingToken],
            [projectSymbol, projectToken],
          ]
        : [
            [projectSymbol, projectToken],
            [raisingSymbol, raisingToken],
          ]
      : raisingSymbol < projectSymbol
        ? [
            [raisingSymbol, raisingToken],
            [projectSymbol, projectToken],
          ]
        : [
            [projectSymbol, projectToken],
            [raisingSymbol, raisingToken],
          ]

  ensure(
    projectTokensHolder.txOut.datum != null,
    {projectTokensHolder},
    'Inline datum must be present',
  )
  const dex = decodeDatum(
    finalProjectTokensHolderDatumCborSchema,
    projectTokensHolder.txOut.datum,
  )
  ensure(
    dex.isOk() && dex.value === 'SundaeSwapV3',
    {err: dex},
    'Only SundaeSwapV3 holders can be spent here',
  )

  const projectTokensHolderUtxo = prismaTxOutputToMeshOutput(
    projectTokensHolder.txOut,
  )

  const sundaePoolTokensPolicyRef =
    poolRefScriptsByNetwork[config.NETWORK].sundaePool

  const wallet = getWallet()
  const b = makeBuilder(getWalletChangeAddress())

  const walletUtxos = getSpendableWalletUtxos()
  setFetcherUtxos([
    ...walletUtxos,
    projectTokensHolderUtxo,
    finalProjectTokensHolderValidatorRef,
    sundaeSettingsUtxo,
    sundaePoolTokensPolicyRef,
  ])
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')
  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )
  b.selectUtxosFrom(walletUtxos)

  const {validityStartSlot, validityEndSlot} = calculateTxValidityInterval(
    config.NETWORK,
  )
  b.invalidBefore(validityStartSlot).invalidHereafter(validityEndSlot)

  // The settings utxo must be referenced
  b.readOnlyTxInReference(
    sundaeSettingsUtxo.input.txHash,
    sundaeSettingsUtxo.input.outputIndex,
  )

  const projectTokensHolderAmount = projectTokensHolderUtxo.output.amount
  // The final project tokens holder must be spent
  b.spendingPlutusScriptV2()
    .txIn(
      projectTokensHolder.txHash,
      projectTokensHolder.outputIndex,
      projectTokensHolderAmount,
      projectTokensHolder.txOut.address,
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

  ensure(
    sundaeSettingsUtxo.output.plutusData != null,
    {sundaeSettingsUtxo},
    'Settings must have the inline datum',
  )
  const sundaeSettingsDatum = decodeDatum(
    getSundaeSettingsDatumCborSchema(config.NETWORK),
    sundaeSettingsUtxo.output.plutusData,
  )
  ensure(
    sundaeSettingsDatum.isOk(),
    {err: sundaeSettingsUtxo},
    'The Sundae settings datum must be correct',
  )
  const poolStakingKey = sundaeSettingsDatum.value.authorizedStakingKeys[0]
  ensure(
    poolStakingKey != null,
    {sundaeSettingsUtxo},
    'The Sundae settings datum must have at least one authorized stake key',
  )

  if (
    sundaeSettingsDatum.value.poolCreationFee > launchConfig.sundaeFeeTolerance
  ) {
    logger.warn(
      {
        launchTxHash: launch.txHash,
        sundaeSettingsDatum,
        feeTolerance: launchConfig.sundaeFeeTolerance,
      },
      'Sundae pool creation fee is above the allowed tolerance',
    )
    return true
  }

  const poolOutputIndex = 0

  const poolAddress = scriptHashToBech32(
    SUNDAE_POOL_SCRIPT_HASH[config.NETWORK],
    // the staking must be among the allowed ones: controlled by settings
    poolStakingKey.value,
    networkToNetworkId[config.NETWORK],
    poolStakingKey.type === 'scriptHash',
  )

  const assetA = createUnit(assetASymbol, assetAToken)
  const assetB = createUnit(assetBSymbol, assetBToken)

  const raisingAmount = projectTokensHolderAmount.find(
    ({unit}) => unit === launchConfig.raisingToken,
  )?.quantity
  ensure(
    raisingAmount != null,
    {projectTokensHolderValueMesh: projectTokensHolderAmount, launchConfig},
    'Raising amount must be present',
  )
  const projectAmount = projectTokensHolderAmount.find(
    ({unit}) => unit === launchConfig.projectToken,
  )?.quantity
  ensure(
    projectAmount != null,
    {projectTokensHolderValueMesh: projectTokensHolderAmount, launchConfig},
    'Project amount must be present',
  )

  const aAmount = BigInt(
    projectTokensHolderAmount.find(({unit}) => unit === assetA)?.quantity ?? 0,
  )
  const bAmount = BigInt(
    projectTokensHolderAmount.find(({unit}) => unit === assetB)?.quantity ?? 0,
  )

  const protocolFees = sundaeSettingsDatum.value.poolCreationFee
  const aAmountSansProtocolFees = isAdaLaunch ? aAmount - protocolFees : aAmount

  // TODO: the way we select utxos here is far from optimal
  //
  //       right now we select a wallet utxo with the highest ada;
  //       mesh might still add inputs if that's not enough
  //
  //       the validation depends on the first input and we need to know it
  const walletUtxo = maxBy(walletUtxos, getUtxoAda)
  ensure(walletUtxo != null, {walletUtxos}, 'No wallet utxo available')

  // We provide an agent utxo to pay the fees
  b.txIn(
    walletUtxo.input.txHash,
    walletUtxo.input.outputIndex,
    walletUtxo.output.amount,
    walletUtxo.output.address,
    0,
  )

  const sortedInputs = sortUtxos([
    walletUtxo,
    prismaTxOutputToMeshOutput(projectTokensHolder.txOut),
  ])
  const firstInput = sortedInputs[0]
  ensure(firstInput != null, {sortedInputs}, 'Must have at least one input')

  const identifier = getSundaePoolIdentifier(firstInput.input)

  // TODO: that probably should be controllable by the launch owner
  const feeManager = null

  // NOTE: Sundae pools don't store liquidity,
  //       it's minted on demand and given to users
  const initialLq = sqrtBigInt(aAmountSansProtocolFees * bAmount)

  const bidFeesPer10Thousand = SUNDAE_POOL_BID_FEES_PER_10_THOUSAND
  const askFeesPer10Thousand = SUNDAE_POOL_ASK_FEES_PER_10_THOUSAND
  const circulatingLp = initialLq
  // NOTE: open immediately
  const marketOpen = 1
  const poolDatum: SundaePoolDatum = {
    identifier,
    assetA,
    assetB,
    circulatingLp,
    bidFeesPer10Thousand,
    askFeesPer10Thousand,
    feeManager,
    marketOpen,
    protocolFees: Number(protocolFees),
  }

  // Constant prefixed in sundae contracts
  // CIP-68 (100) reference token
  const poolRefAssetName = CIP68_100(identifier)
  // CIP-68 (222) nft token
  const poolNftAssetName = CIP68_222(identifier)
  // CIP-68 (333) fungible token, mesh doesn't have a function for that
  const poolLpAssetName = `0014df10${identifier}`

  ensure(
    [poolRefAssetName, poolNftAssetName, poolLpAssetName].every(
      (assetName) => assetName.length <= 64,
    ),
    {
      launchTxHash: launch.txHash,
      poolRefAssetName,
      poolNftAssetName,
      poolLpAssetName,
    },
    'Some of the computed asset names are too long, they have to fit in 32 bytes',
  )

  const poolAssets: Asset[] = [
    {
      unit: createUnit(launchConfig.sundaePoolScriptHash, poolNftAssetName),
      quantity: '1',
    },
    {
      unit: launchConfig.raisingToken,
      quantity: raisingAmount,
    },
    {
      unit: launchConfig.projectToken,
      quantity: projectAmount,
    },
    ...(isAdaLaunch
      ? [] // Raising ada, pool creation fee is paid by owner (from raisingAmount)
      : [
          {
            // Raising non-ada, pool creation fee is paid by agent
            // ^ TODO: we should include the tolerance into what we send to the agent
            //         and we should return whatever's left to the user afterwards
            unit: LOVELACE_UNIT,
            quantity: sundaeSettingsDatum.value.poolCreationFee.toString(),
          },
        ]),
  ]

  // We pay to the pool
  b.txOut(poolAddress, poolAssets).txOutInlineDatumValue(
    sundaePoolDatumToMeshData(poolDatum),
  )

  const metadataOutputIndex = 1
  // We pay to the metadata output
  b.txOut(sundaeSettingsDatum.value.metadataAdminBech32Address, [
    {
      unit: createUnit(launchConfig.sundaePoolScriptHash, poolRefAssetName),
      quantity: '1',
    },
  ]).txOutInlineDatumValue(
    // Void is a UPLC unit. No idea about the data representation
    mConStr0([]),
  )

  const beneficiary = launchConfig.ownerBech32Address
  const ownerStaking =
    deserializeAddress(beneficiary).stakeCredentialHash || undefined

  const vestingAddress = scriptHashToBech32(
    launchConfig.vestingValidatorHash,
    ownerStaking,
    networkToNetworkId[config.NETWORK],
    false,
  )
  const vestingDatum: VestingDatum = {
    beneficiary,
    vestingSymbol: launchConfig.sundaePoolScriptHash,
    vestingToken: poolLpAssetName,
    totalVestingQty: initialLq,
    vestingPeriodStart: launchConfig.vestingPeriodStart,
    vestingPeriodEnd:
      launchConfig.vestingPeriodStart +
      Number(launchConfig.vestingPeriodDuration),
    firstUnlockPossibleAfter:
      launchConfig.vestingPeriodStart +
      Number(launchConfig.vestingPeriodDurationToFirstUnlock),
    totalInstallments: Number(launchConfig.vestingPeriodInstallments),
    vestingMemo: '',
  }
  const vestingAssets: Asset[] = [
    {
      unit: createUnit(launchConfig.sundaePoolScriptHash, poolLpAssetName),
      quantity: initialLq.toString(),
    },
  ]
  // We pay to the vesting output
  b.txOut(vestingAddress, vestingAssets).txOutInlineDatumValue(
    vestingDatumToMeshData(vestingDatum),
  )

  const sundaePoolTokensPolicyId = sundaePoolTokensPolicyRef.output.scriptHash
  ensure(
    launchConfig.sundaePoolScriptHash === sundaePoolTokensPolicyId,
    {launchTxHash: launch.txHash, launch, sundaePoolTokensPolicyId},
    'Sundae pool tokens policy should match the launch config',
  )

  // We mint the pool tokens:
  //  - 1 pool ref token            -> goes to the pool
  //  - 1 pool nft token            -> goes to the pool
  //  - initialLq of pool lp tokens -> goes to the vesting
  for (const {quantity, assetName} of [
    {quantity: '1', assetName: poolRefAssetName},
    {quantity: '1', assetName: poolNftAssetName},
    {quantity: initialLq.toString(), assetName: poolLpAssetName},
  ]) {
    b.mintPlutusScriptV2()
      .mint(quantity, sundaePoolTokensPolicyId, assetName)
      .mintTxInReference(
        sundaePoolTokensPolicyRef.input.txHash,
        sundaePoolTokensPolicyRef.input.outputIndex,
        sundaePoolTokensPolicyRef.scriptSize.toString(),
        sundaePoolTokensPolicyRef.output.scriptHash,
      )
      .mintRedeemerValue(
        sundaePoolMintRedeemerToMeshData({
          type: 'CreatePool',
          assets: [
            [assetASymbol, assetAToken],
            [assetBSymbol, assetBToken],
          ],
          poolOutput: poolOutputIndex,
          metadataOutput: metadataOutputIndex,
        }),
      )
  }

  const unsignedTx = await buildTx(b)
  if (unsignedTx.isErr()) {
    logger.error(
      {
        error: unsignedTx.error,
        txBuilderBody: getMeshBuilderBodyForLogging(b),
        launchTxHash: launch.txHash,
      },
      `Error when building transaction: ${unsignedTx.error.message}`,
    )
    return false
  }

  trackSpentInputs(b)

  const signedTx = await wallet.signTx(unsignedTx.value)
  const txHash = await Result.tryPromise(() => submitTx(signedTx))

  if (txHash.isErr()) {
    logger.error(
      {
        txBuilderBody: getMeshBuilderBodyForLogging(b),
        signedTx,
        error: txHash.error,
        cause: txHash.error.cause,
        launchTxHash: launch.txHash,
      },
      'Error when submitting Sundae Pool creation transaction',
    )
    return false
  }

  return false
}
