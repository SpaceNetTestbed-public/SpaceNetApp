'use client'
import { usePathname } from 'next/navigation'
import { Header } from './Header'

export function ConditionalHeader() {
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  // App routes use (app) layout with TopNav, so don't render Header
  const isAppRoute = pathname.startsWith('/experiments') ||
                     pathname.startsWith('/runs') ||
                     pathname.startsWith('/jobs') ||
                     pathname.startsWith('/ground-stations') ||
                     pathname.startsWith('/about')

  // Don't render Header on homepage (it has its own navbar)
  // App routes use the (app) layout with TopNav
  if (isHomePage || isAppRoute) {
    return null
  }

  return <Header />
}

