const f = {
  installedWalletsIds: () => ['installed-wallets-ids'] as const,

  wallet: () => ['wallet'] as const,
}

export {f as queryKeyFactory}
