import {
  createTransactionSubmissionClient,
  type TransactionSubmission,
} from '@cardano-ogmios/client'
import {ensure} from '@wingriders/multi-dex-launchpad-common'
import {getOgmiosContext} from './ogmios'

let txSubmissionClient: TransactionSubmission.TransactionSubmissionClient | null =
  null

export const initializeTxSubmissionClient = async () => {
  if (txSubmissionClient != null) return

  const ogmiosContext = await getOgmiosContext()
  txSubmissionClient = await createTransactionSubmissionClient(ogmiosContext)
  ogmiosContext.socket.addEventListener('close', () =>
    initializeTxSubmissionClient(),
  )
}

export const isTxSubmissionClientInitialized = () => txSubmissionClient != null

export const submitTx = (signedTxBody: string) => {
  ensure(txSubmissionClient !== null, 'TxSubmission client not initialized')
  return txSubmissionClient.submitTransaction(signedTxBody)
}
