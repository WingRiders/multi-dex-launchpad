import type {IWallet} from '@meshsdk/core'
import {MeshTxBuilder, OfflineFetcher} from '@meshsdk/core'
import {
  matchUtxo,
  walletNetworkIdToNetwork,
} from '@wingriders/multi-dex-launchpad-common'
import {getWalletCollateralUtxo} from '../../../common/src/helpers/collateral'

type InitTxBuilderArgs = {
  wallet: IWallet
}

export const initTxBuilder = async ({wallet}: InitTxBuilderArgs) => {
  const network = walletNetworkIdToNetwork(await wallet.getNetworkId())
  const walletUtxos = await wallet.getUtxos()

  const collateralUtxo = await getWalletCollateralUtxo(wallet, walletUtxos)
  if (!collateralUtxo) {
    throw new Error('No collateral UTxO found')
  }
  const isCollateral = matchUtxo(collateralUtxo.input)

  const availableWalletUtxos = walletUtxos.filter(
    (utxo) => !isCollateral(utxo.input),
  )

  const changeAddress = await wallet.getChangeAddress()

  const fetcher = new OfflineFetcher()
  fetcher.addUTxOs([...walletUtxos, collateralUtxo])

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
