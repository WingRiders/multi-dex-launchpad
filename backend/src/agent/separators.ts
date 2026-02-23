import {
  type MeshTxBuilder,
  SLOT_CONFIG_NETWORK,
  slotToBeginUnixTime,
  type UTxO,
} from '@meshsdk/core'
import {
  buildTx,
  buildTxNeverUseUnlessManuallyBalancing,
  calculateTxValidityInterval,
  calculateTxValidityIntervalBeforeLaunchStart,
  createUnit,
  decodeDatum,
  ensure,
  type GeneratedContracts,
  LOVELACE_UNIT,
  launchpadConstants,
  makeBuilder,
  type NodeDatum,
  nodeDatumCborSchema,
  nodeDatumToMeshData,
  nodeRedeemerToMeshData,
} from '@wingriders/multi-dex-launchpad-common'
import {Result} from 'better-result'
import {chunk} from 'es-toolkit'
import type {Launch, Node, TxOutput} from '../../prisma/generated/client'
import {config} from '../config'
import {
  prismaLaunchToLaunchConfig,
  prismaTxOutputToMeshOutput,
} from '../db/helpers'
import {txOutputToRefScriptUtxo} from '../endpoints/ref-scripts'
import {logger} from '../logger'
import {SEPARATORS_TO_RECLAIM} from './constants'
import {getMeshBuilderBodyForLogging} from './helpers'
import {submitTx} from './ogmios/tx-submission-client'
import {offlineEvaluator, ogmiosProvider, setFetcherUtxos} from './providers'
import {
  getSpendableWalletUtxos,
  getWallet,
  getWalletChangeAddress,
  getWalletPubKeyHash,
  trackNewWalletUtxos,
  trackSpentInputs,
} from './wallet'

export const insertSeparators = async (
  contracts: GeneratedContracts,
  launch: Launch,
  headNodeTxOutput: TxOutput,
  nodeValidatorRefScriptCarrier: TxOutput,
  nodePolicyRefScriptCarrier: TxOutput,
  separatorsCount: number,
): Promise<string | null> => {
  const launchConfig = prismaLaunchToLaunchConfig(launch)

  ensure(
    headNodeTxOutput.datum != null,
    {headNodeTxOutput},
    'Node inline datum must always exist',
  )
  const headNode = prismaTxOutputToMeshOutput(headNodeTxOutput)
  const nodeValidatorRef = txOutputToRefScriptUtxo(
    nodeValidatorRefScriptCarrier,
  )
  const nodePolicyRef = txOutputToRefScriptUtxo(nodePolicyRefScriptCarrier)

  const slotConfig = SLOT_CONFIG_NETWORK[config.NETWORK]
  const {validityStartSlot, validityEndSlot} =
    calculateTxValidityIntervalBeforeLaunchStart(
      config.NETWORK,
      Number(launch.startTime),
    )

  ensure(headNode.output.plutusData != null, {headNode}, 'Node must have datum')
  const headNodeDatum = decodeDatum(
    nodeDatumCborSchema,
    headNode.output.plutusData,
  )
  ensure(headNodeDatum != null, {headNode}, 'Node datum must be valid')

  const wallet = getWallet()

  const b = makeBuilder(
    getWalletChangeAddress(),
    config.NETWORK,
    ogmiosProvider,
    offlineEvaluator,
  )

  const walletUtxos = getSpendableWalletUtxos()

  setFetcherUtxos([...walletUtxos, nodePolicyRef, nodeValidatorRef, headNode])
  const collateral = (await wallet.getCollateral())[0]
  ensure(collateral != null, 'No collateral available')
  b.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex,
    collateral.output.amount,
    collateral.output.address,
  )
  b.selectUtxosFrom(walletUtxos)

  // spend the head node
  b.spendingPlutusScriptV2()
    .txIn(
      headNode.input.txHash,
      headNode.input.outputIndex,
      headNode.output.amount,
      headNode.output.address,
      0,
    )
    .spendingTxInReference(
      nodeValidatorRef.input.txHash,
      nodeValidatorRef.input.outputIndex,
      nodeValidatorRef.scriptSize.toString(),
      nodeValidatorRef.output.scriptHash,
    )
    .txInInlineDatumPresent()
    .txInRedeemerValue(
      // Offset is 1 because the first output is the change,
      // and the second is the recreated head node
      // All the separator nodes are directly after it
      // The offset must indicate where the head node starts
      nodeRedeemerToMeshData({type: 'insert-separators', offset: 1}),
    )

  const separatorDatums = generateSeparatorDatums(
    generateSeparatorKeys(
      separatorsCount,
      launchpadConstants.separatorNodeKeyLength,
    ),
    slotToBeginUnixTime(validityEndSlot, slotConfig),
  )

  // create the updated head node (must be before separators)
  b.txOut(
    headNode.output.address,
    headNode.output.amount,
  ).txOutInlineDatumValue(
    nodeDatumToMeshData({
      ...headNodeDatum,
      next: separatorDatums[0]!.key,
    }),
  )

  // create the separator nodes
  for (const separatorDatum of separatorDatums) {
    b.txOut(headNode.output.address, [
      // each separator node must have oil+fee ada
      {unit: LOVELACE_UNIT, quantity: launchConfig.nodeAda.toString()},
      // and 1 node validity token
      {
        unit: createUnit(
          contracts.nodePolicy.hash,
          contracts.nodeValidator.hash,
        ),
        quantity: '1',
      },
    ]).txOutInlineDatumValue(nodeDatumToMeshData(separatorDatum))
  }

  // mint new tokens for the separator nodes
  b.mintPlutusScriptV2()
    .mint(
      separatorsCount.toString(),
      contracts.nodePolicy.hash,
      contracts.nodeValidator.hash,
    )
    .mintTxInReference(
      nodePolicyRef.input.txHash,
      nodePolicyRef.input.outputIndex,
      nodePolicyRef.scriptSize.toString(),
      nodePolicyRef.output.scriptHash,
    )
    .mintRedeemerValue([])

  // The validity range should be finite and end before tx launch start
  b.invalidBefore(validityStartSlot)
  b.invalidHereafter(validityEndSlot)

  // the dao admin must sign the transaction
  b.requiredSignerHash(launchConfig.daoAdminPubKeyHash)

  // TODO: it can be calculated correctly
  //       it doesn't help that mesh js exposes almost no levers for us to pull
  //       right now we overpay the fee
  const fee = 2_170_000n

  const {usedWalletUtxo, changeOutput} = pickWalletUtxo(b, fee, walletUtxos)

  // The change must be before separators
  // So we explicitly add it ourselves
  b.txIn(
    usedWalletUtxo.input.txHash,
    usedWalletUtxo.input.outputIndex,
    usedWalletUtxo.output.amount,
    usedWalletUtxo.output.address,
    0,
  )
  // Mesh doesn't allow specifying the position
  // .txOut(...) pushes at the end
  b.meshTxBuilderBody.outputs.unshift(changeOutput)

  // We can't use the normal buildTx (which is b.complete())
  // because it tries to add a change output last and fails evaluation because of that.
  // There's no way to pass any arguments to the internals to affect that.
  const unsignedTx = await buildTxNeverUseUnlessManuallyBalancing(b, fee)

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

const pickWalletUtxo = (b: MeshTxBuilder, fee: bigint, walletUtxos: UTxO[]) => {
  // TODO: That is incorrect when the diff is below min ada?
  const requiredAdaOutput = b.meshTxBuilderBody.outputs.reduce(
    (acc, output) =>
      acc +
      BigInt(
        output.amount.find((asset) => asset.unit === LOVELACE_UNIT)?.quantity ??
          '0',
      ),
    // we start with the fee
    fee,
  )
  const usedWalletUtxo = walletUtxos.find(
    (utxo) =>
      BigInt(
        utxo.output.amount.find((asset) => asset.unit === LOVELACE_UNIT)
          ?.quantity ?? '0',
      ) >= requiredAdaOutput,
  )
  ensure(usedWalletUtxo != null, 'No wallet utxo with enough ada found')
  const usedWalletAda = BigInt(
    usedWalletUtxo.output.amount.find((asset) => asset.unit === LOVELACE_UNIT)!
      .quantity,
  )
  const diff = usedWalletAda - requiredAdaOutput

  return {
    usedWalletUtxo,
    changeOutput: {
      address: getWalletChangeAddress(),
      amount: [{unit: LOVELACE_UNIT, quantity: diff.toString()}],
    },
  }
}

const generateSeparatorDatums = (
  keys: string[],
  createdTime: number,
): NodeDatum[] => {
  const separatorDatums: NodeDatum[] = []
  for (let i = keys.length - 1; i >= 0; i--) {
    separatorDatums.unshift({
      key: {hash: keys[i]!, index: 0},
      next: i === keys.length - 1 ? null : separatorDatums[0]!.key,
      createdTime,
      committed: 0n,
    })
  }
  return separatorDatums
}

const generateSeparatorKeys = (n: number, keyBytes: number): string[] => {
  ensure(n >= 1, "Can't generate 0 keys")
  const possibleKeysCount = 2 ** (keyBytes * 8)

  const distanceBetweenKeys = Math.floor(possibleKeysCount / n)
  ensure(
    distanceBetweenKeys > 0,
    {distanceBetweenKeys},
    "Can't generate keys with such distance",
  )

  const decimalsKeys: number[] = Array.from(
    {length: n},
    (_, i) => distanceBetweenKeys * i,
  )

  const hexKeys = decimalsKeys.map((key) =>
    key.toString(16).padStart(keyBytes * 2, '0'),
  )
  return hexKeys
}

// Returns true if all txs submitted
// Returns null in case of error (either building or submitting tx)
export const reclaimSeparators = async (
  launchTxHash: string,
  unspentSeparators: (Node & {txOut: TxOutput})[],
  contracts: GeneratedContracts,
  failProofTxOutput: TxOutput,
  nodePolicyRefScriptTxOutput: TxOutput,
  nodeValidatorRefScriptTxOutput: TxOutput,
) => {
  const nodePolicyRef = txOutputToRefScriptUtxo(nodePolicyRefScriptTxOutput)
  const nodeValidatorRef = txOutputToRefScriptUtxo(
    nodeValidatorRefScriptTxOutput,
  )

  const wallet = getWallet()

  for (const unspentSeparatorsChunk of chunk(
    unspentSeparators,
    SEPARATORS_TO_RECLAIM,
  )) {
    const logContext = {
      launchTxHash,
      unspentSeparatorsChunkSize: unspentSeparatorsChunk.length,
    }

    const b = makeBuilder(
      getWalletChangeAddress(),
      config.NETWORK,
      ogmiosProvider,
      offlineEvaluator,
    )
    const walletUtxos = getSpendableWalletUtxos()
    b.selectUtxosFrom(walletUtxos)

    const unspentSeparatorUtxos = unspentSeparatorsChunk.map(({txOut}) =>
      prismaTxOutputToMeshOutput(txOut),
    )

    // Spend nodes
    for (const separatorNodeUtxo of unspentSeparatorUtxos) {
      b.spendingPlutusScriptV2()
        .txIn(
          separatorNodeUtxo.input.txHash,
          separatorNodeUtxo.input.outputIndex,
          separatorNodeUtxo.output.amount,
          separatorNodeUtxo.output.address,
          0,
        )
        .spendingTxInReference(
          nodeValidatorRef.input.txHash,
          nodeValidatorRef.input.outputIndex,
          nodeValidatorRef.scriptSize.toString(),
          nodeValidatorRef.output.scriptHash,
        )
        .txInInlineDatumPresent()
        .txInRedeemerValue(
          nodeRedeemerToMeshData({
            type: 'reclaim-after-failure',
          }),
        )
    }

    // Burn node tokens
    b.mintPlutusScriptV2()
      .mint(
        `-${unspentSeparatorUtxos.length}`,
        contracts.nodePolicy.hash,
        contracts.nodeValidator.hash,
      )
      .mintTxInReference(
        nodePolicyRef.input.txHash,
        nodePolicyRef.input.outputIndex,
        nodePolicyRef.scriptSize.toString(),
        nodePolicyRef.output.scriptHash,
      )
      .mintRedeemerValue([])

    // Reference fail proof
    const failProofUtxo = prismaTxOutputToMeshOutput(failProofTxOutput)
    b.readOnlyTxInReference(
      failProofUtxo.input.txHash,
      failProofUtxo.input.outputIndex,
    )

    // Validity interval
    const {validityStartSlot, validityEndSlot} = calculateTxValidityInterval(
      config.NETWORK,
    )
    b.invalidBefore(validityStartSlot).invalidHereafter(validityEndSlot)

    setFetcherUtxos([
      ...walletUtxos,
      nodePolicyRef,
      nodeValidatorRef,
      failProofUtxo,
      ...unspentSeparatorUtxos,
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
          ...logContext,
          txBuilderBody: getMeshBuilderBodyForLogging(b),
        },
        `Error when building transaction to reclaim separators: ${unsignedTx.error.message}`,
      )
      return null
    }

    trackSpentInputs(b)

    const signedTx = await wallet.signTx(unsignedTx.value)
    logger.info(
      {...logContext, signedTx},
      'Submitting reclaim separators transaction...',
    )
    const txHash = await Result.tryPromise(() => submitTx(signedTx))
    if (txHash.isErr()) {
      logger.error(
        {
          ...logContext,
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
      'Submitted reclaim separators transaction',
    )

    const newUtxos = b.meshTxBuilderBody.outputs.map((output, outputIndex) => ({
      input: {
        txHash: txHash.value,
        outputIndex,
      },
      output,
    }))

    trackNewWalletUtxos(
      newUtxos.filter(
        ({output}) => output.address === getWalletChangeAddress(),
      ),
    )

    // Continue with next chunk
  }
  return true
}
