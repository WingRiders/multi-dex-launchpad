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

const RootLayout = ({children}: LayoutProps<'/'>) => {
  return (
    <html
      lang="en"
      // ThemeProvider from next-themes updates the html attributes client-side, which causes hydration mismatch warnings
      suppressHydrationWarning
    >
      <head>
        <PublicEnvScript />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        // some extensions can cause hydration mismatch warnings by updating the body attributes client-side before our React loads
        suppressHydrationWarning
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
