export const networks = ['preprod', 'mainnet'] as const
export type Network = (typeof networks)[number]

export const walletNetworkIdToNetwork = (networkId: number): Network => {
  switch (networkId) {
    case 0:
      return 'preprod'
    case 1:
      return 'mainnet'
    default:
      throw new Error(`Unknown network id: ${networkId}`)
  }
}

export const networkToNetworkId = {
  mainnet: 1,
  preprod: 0,
} as const satisfies Record<Network, number>
