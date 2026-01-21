import {ConnectWalletButton} from './connect-wallet/connect-wallet-button'

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-border/40 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <h1 className="font-bold text-2xl tracking-tight">Multi DEX Launchpad</h1>

      <ConnectWalletButton />
    </header>
  )
}
