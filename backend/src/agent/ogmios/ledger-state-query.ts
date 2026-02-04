import {createLedgerStateQueryClient} from '@cardano-ogmios/client'
import {getOgmiosContext} from './ogmios'

let ledgerStateQueryClient:
  | Awaited<ReturnType<typeof createLedgerStateQueryClient>>
  | undefined
const getLedgerStateQueryClient = async () => {
  // If the underlying socket connection has terminated recreate the client
  if (
    !ledgerStateQueryClient ||
    ledgerStateQueryClient.context.socket.readyState > 1
  ) {
    ledgerStateQueryClient = await createLedgerStateQueryClient(
      await getOgmiosContext(),
    )
  }
  return ledgerStateQueryClient
}

export const getNetworkTip = async () =>
  (await getLedgerStateQueryClient()).networkTip()

export const getLedgerTip = async () =>
  (await getLedgerStateQueryClient()).ledgerTip()

export const getUtxos = async (addresses: string[]) =>
  (await getLedgerStateQueryClient()).utxo({addresses})

export const getProtocolParameters = async () =>
  (await getLedgerStateQueryClient()).protocolParameters()

export const getCurrentEpoch = async () =>
  (await getLedgerStateQueryClient()).epoch()
