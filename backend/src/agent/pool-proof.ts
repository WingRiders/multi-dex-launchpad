import type {MeshTxBuilder, TxInput} from '@meshsdk/core'
import {scriptHashToBech32} from '@meshsdk/core-cst'
import {
  buildTx,
  type ConstantContracts,
  constantRefScriptsByNetwork,
  createUnit,
  type Dex,
  dexToMeshData,
  ensure,
  type LaunchConfig,
  makeBuilder,
  networkToNetworkId,
  parseUnit,
  poolProofDatumToMeshData,
  type RefScriptUtxo,
} from '@wingriders/multi-dex-launchpad-common'
import {
  type Launch,
  Dex as PrismaDex,
  type TxOutput,
} from '../../prisma/generated/client'
import {config} from '../config'
import {
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../db/helpers'
import {prisma} from '../db/prisma-client'
import {logger} from '../logger'
import {CONSTANT_CONTRACTS} from './constants'
import {getMeshBuilderBodyForLogging} from './helpers'
import {submitTx} from './ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from './providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  trackSpentInputs,
} from './wallet'

// TODO: keep cache of submitted pool proofs like with commit fold
// We check if there are pools but no pool proofs
// we create those if needed
export const createPoolProofsIfNeeded = async (launch: Launch) => {
  const launchTxHash = launch.txHash

  const poolProofs = await prisma.poolProof.findMany({
    where: {launchTxHash, txOut: {spentSlot: null}},
    select: {dex: true, txOut: true},
  })

  if (!poolProofs.some((p) => p.dex === PrismaDex.WR)) {
    const wrPool = await prisma.wrPool.findFirst({
      where: {launchTxHash, txOut: {spentSlot: null}},
      select: {txOut: true},
    })
    if (!wrPool) logger.info({launchTxHash}, 'No WingRiders pool created yet')
    else {
      logger.info({launchTxHash}, 'Creating WingRiders pool proof')
      const txHash = await createPoolProof(
        launch,
        wrPool.txOut,
        'WingRidersV2',
        constantRefScriptsByNetwork[config.NETWORK].poolProofPolicy,
      )
      if (txHash)
        logger.info({launchTxHash, txHash}, 'Created WingRiders pool proof')
      else
        logger.error({launchTxHash}, 'Failed to create WingRiders pool proof')
      return
    }
  } else logger.info({launchTxHash}, 'WingRiders pool proof exists')

  if (!poolProofs.some((p) => p.dex === PrismaDex.SUNDAE)) {
    const sundaePool = await prisma.sundaePool.findFirst({
      where: {launchTxHash, txOut: {spentSlot: null}},
      select: {txOut: true},
    })
    if (!sundaePool) logger.info({launchTxHash}, 'No Sundae pool created yet')
    else {
      logger.info({launchTxHash}, 'Creating Sundae pool proof')
      const txHash = await createPoolProof(
        launch,
        sundaePool.txOut,
        'SundaeSwapV3',
        constantRefScriptsByNetwork[config.NETWORK].poolProofPolicy,
      )
      if (txHash)
        logger.info({launchTxHash, txHash}, 'Created Sundae pool proof')
      else logger.error({launchTxHash}, 'Failed to create Sundae pool proof')
      return
    }
  } else logger.info({launchTxHash}, 'Sundae pool proof exists')
}

const createPoolProof = async (
  launch: Launch,
  poolTxOut: TxOutput,
  dex: Dex,
  poolProofPolicyRef: RefScriptUtxo,
) => {
  const launchConfig = prismaLaunchToLaunchConfig(launch)

  const poolUtxo = prismaTxOutputToMeshOutput(poolTxOut)

  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )

  const walletUtxos = getSpendableWalletUtxos()

  setFetcherUtxos([...walletUtxos, poolUtxo, poolProofPolicyRef])
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')
  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )
  b.selectUtxosFrom(walletUtxos)

  addCreatePoolProof(
    b,
    launchConfig,
    CONSTANT_CONTRACTS,
    poolProofPolicyRef,
    poolUtxo.input,
    dex,
  )

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

  trackSpentInputs(b)

  const signedTx = await wallet.signTx(unsignedTx.value)
  const txHash = await submitTx(signedTx)
  return txHash
}

const addCreatePoolProof = (
  b: MeshTxBuilder,
  launchConfig: LaunchConfig,
  constantContracts: ConstantContracts,
  poolProofPolicyRef: RefScriptUtxo,
  poolInput: TxInput,
  dex: Dex,
) => {
  const network = b.meshTxBuilderBody.network
  ensure(
    network === 'preprod' || network === 'mainnet',
    {builder: b},
    'The network must be a supported one',
  )

  const [projectSymbol, projectToken] = parseUnit(launchConfig.projectToken)
  const [raisingSymbol, raisingToken] = parseUnit(launchConfig.raisingToken)

  b.readOnlyTxInReference(poolInput.txHash, poolInput.outputIndex)

  b.txOut(
    scriptHashToBech32(
      constantContracts.poolProofValidator.hash,
      undefined,
      networkToNetworkId[network],
    ),
    [
      {
        unit: createUnit(
          constantContracts.poolProofPolicy.hash,
          constantContracts.poolProofValidator.hash,
        ),
        quantity: '1',
      },
    ],
  ).txOutInlineDatumValue(
    poolProofDatumToMeshData({
      dex,
      projectSymbol,
      projectToken,
      raisingSymbol,
      raisingToken,
    }),
  )

  b.mintPlutusScriptV2()
    .mint(
      '1',
      constantContracts.poolProofPolicy.hash,
      constantContracts.poolProofValidator.hash,
    )
    .mintTxInReference(
      poolProofPolicyRef.input.txHash,
      poolProofPolicyRef.input.outputIndex,
      poolProofPolicyRef.scriptSize.toString(),
      poolProofPolicyRef.output.scriptHash,
    )
    .mintRedeemerValue(dexToMeshData(dex))

  return b
}
