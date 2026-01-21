import type {Metadata} from 'next'
import {Geist, Geist_Mono} from 'next/font/google'
import './globals.css'
import {PublicEnvScript} from 'next-runtime-env'
import {Suspense} from 'react'
import {WalletStateHandler} from '@/components/connect-wallet/wallet-state-handler'
import {Header} from '@/components/header'
import {QueryProvider} from '@/components/query-provider'
import {ThemeProvider} from '@/components/theme-provider'
import {Toaster} from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Multi DEX Launchpad',
  description: 'Multi DEX Launchpad',
}

export const dynamic = 'force-dynamic'

type RootLayoutProps = {
  children: React.ReactNode
}

const RootLayout = ({children}: RootLayoutProps) => {
  return (
    <html lang="en">
      <head>
        <PublicEnvScript />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <Header />
            <Suspense>{children}</Suspense>
            <Toaster />
            <WalletStateHandler />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
