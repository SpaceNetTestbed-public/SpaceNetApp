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
      <body className={`${inter.variable} font-inter bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text`}>
        <Providers>
          <ConditionalHeader />
          <main>{children}</main>
          <ToasterProvider />
        </Providers>
      </body>
    </html>
  )
}

