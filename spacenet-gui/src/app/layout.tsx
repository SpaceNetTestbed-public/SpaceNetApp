import './globals.css'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import { ConditionalHeader } from '@/components/ConditionalHeader'
import ToasterProvider from '@/components/ToasterProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'SpaceNet Testbed',
  description: 'Simulate, visualize, and download results'
}

export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} font-inter bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-vt-maroon focus:text-white focus:rounded-md focus:outline-none"
        >
          Skip to main content
        </a>
        <Providers>
          <ConditionalHeader />
          <main id="main-content">{children}</main>
          <ToasterProvider />
        </Providers>
      </body>
    </html>
  )
}

