import type {IWallet, UTxO} from '@meshsdk/core'
import {isLovelaceUnit} from '@wingriders/multi-dex-launchpad-common'

const COLLATERAL_MIN_LOVELACE_AMOUNT = 3_000_000n
const COLLATERAL_MAX_LOVELACE_AMOUNT = 5_000_000n

export const isCollateralUtxo = (utxo: UTxO) => {
  const lovelaceAmountString = utxo.output.amount.find(({unit}) =>
    isLovelaceUnit(unit),
  )?.quantity

  if (lovelaceAmountString == null) return false

  const lovelaceAmount = BigInt(lovelaceAmountString)

  return (
    lovelaceAmount >= COLLATERAL_MIN_LOVELACE_AMOUNT &&
    lovelaceAmount <= COLLATERAL_MAX_LOVELACE_AMOUNT
  )
}

export const getWalletCollateralUtxo = async (
  wallet: IWallet,
  walletUtxos?: UTxO[],
): Promise<UTxO | undefined> => {
  // first, try to get the collateral from the wallet API
  const collateral = await wallet.getCollateral()
  if (collateral.length > 0) return collateral[0]!

  // if that doesn't return anything, try to use any suitable regular UTxO as a collateral
  const utxos = walletUtxos ?? (await wallet.getUtxos())
  return utxos.find(isCollateralUtxo)
}
