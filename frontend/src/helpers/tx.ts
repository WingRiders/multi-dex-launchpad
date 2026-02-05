import type {IWallet, UTxO} from '@meshsdk/core'
import {MeshTxBuilder, OfflineFetcher} from '@meshsdk/core'
import {
  matchUtxo,
  type Network,
  walletNetworkIdToNetwork,
} from '@wingriders/multi-dex-launchpad-common'
import {getWalletCollateralUtxo} from '../../../common/src/helpers/collateral'

type InitTxBuilderArgs = {
  wallet?: IWallet
  network?: Network
  walletUtxos?: UTxO[]
  collateralUtxo?: UTxO
  changeAddress?: string
  additionalFetcherUtxos?: UTxO[]
}

const fallbackFromWallet = async <TValue, TGetFromWalletResult>(
  value: TValue | undefined,
  wallet: IWallet | undefined,
  getFromWallet: (wallet: IWallet) => Promise<TGetFromWalletResult>,
): Promise<TValue | TGetFromWalletResult> => {
  if (value != null) return value
  if (wallet == null) throw new Error('Wallet is required')
  return getFromWallet(wallet)
}

export const initTxBuilder = async ({
  wallet,
  network: networkArg,
  walletUtxos: walletUtxosArg,
  collateralUtxo: collateralUtxoArg,
  changeAddress: changeAddressArg,
  additionalFetcherUtxos,
}: InitTxBuilderArgs) => {
  const network = await fallbackFromWallet(networkArg, wallet, async (wallet) =>
    walletNetworkIdToNetwork(await wallet.getNetworkId()),
  )
  const walletUtxos = await fallbackFromWallet(
    walletUtxosArg,
    wallet,
    (wallet) => wallet.getUtxos(),
  )
  const collateralUtxo = await fallbackFromWallet(
    collateralUtxoArg,
    wallet,
    (wallet) => getWalletCollateralUtxo(wallet, walletUtxos),
  )
  if (!collateralUtxo) {
    throw new Error('No collateral UTxO found')
  }
  const isCollateral = matchUtxo(collateralUtxo.input)

  const availableWalletUtxos = walletUtxos.filter(
    (utxo) => !isCollateral(utxo.input),
  )

  const changeAddress = await fallbackFromWallet(
    changeAddressArg,
    wallet,
    (wallet) => wallet.getChangeAddress(),
  )

  const fetcher = new OfflineFetcher()
  fetcher.addUTxOs([
    ...walletUtxos,
    collateralUtxo,
    ...(additionalFetcherUtxos ?? []),
  ])

  const coreCsl = await import('@meshsdk/core-csl')
  const evaluator = new coreCsl.OfflineEvaluator(fetcher, network)

  return new MeshTxBuilder({
    evaluator: {
      evaluateTx: (tx) => evaluator.evaluateTx(tx, [], []),
    },
    fetcher,
  })
    .setNetwork(network)
    .selectUtxosFrom(availableWalletUtxos)
    .changeAddress(changeAddress)
    .txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
      collateralUtxo.output.amount,
      collateralUtxo.output.address,
    )
}

export const getTxFee = async (tx: string) => {
  const coreCsl = await import('@meshsdk/core-csl')
  const fee = coreCsl.csl.Transaction.from_hex(tx).body().fee().to_str()
  return BigInt(fee)
}
