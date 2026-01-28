const f = {
  installedWalletsIds: () => ['installed-wallets-ids'] as const,

  wallet: () => ['wallet'] as const,
  walletBalance: () => [...f.wallet(), 'balance'] as const,
}

export {f as queryKeyFactory}
