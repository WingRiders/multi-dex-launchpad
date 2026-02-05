import type {TxInput, UTxO} from '@meshsdk/core'
import type {
  CompleteDataForDraftStage,
  LaunchDraftStage,
} from '@/app/create/types'
import {replaceBigIntsWithStrings} from './replace'

const f = {
  installedWalletsIds: () => ['installed-wallets-ids'] as const,

  wallet: () => ['wallet'] as const,
  walletBalance: () => [...f.wallet(), 'balance'] as const,
  walletUtxos: () => [...f.wallet(), 'utxos'] as const,
  walletCollateralUtxo: () => [...f.wallet(), 'collateral-utxo'] as const,
  signTx: () => [...f.wallet(), 'sign-tx'] as const,
  submitTx: () => [...f.wallet(), 'submit-tx'] as const,

  walletMutation: () => [...f.wallet(), 'mutation'] as const,
  buildInitTx: (
    draft: CompleteDataForDraftStage<LaunchDraftStage.OVERVIEW>,
    walletUtxos: UTxO[] | undefined,
  ) =>
    [
      ...f.walletMutation(),
      'build-init-tx',
      replaceBigIntsWithStrings(draft),
      walletUtxos,
    ] as const,
  buildCreateCommitmentTx: (
    launchTxHash: string,
    committed: bigint | null,
    nodeToSpend: TxInput | undefined,
  ) =>
    [
      ...f.walletMutation(),
      'build-create-commitment-tx',
      launchTxHash,
      committed?.toString(),
      nodeToSpend,
    ] as const,
}

export {f as queryKeyFactory}
