'use client'
import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'

export function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/80 dark:bg-black/60 backdrop-blur-md' : 'bg-transparent'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-vt-maroon flex items-center justify-center">
              <div className="text-white text-lg font-bold">SN</div>
            </div>
            <span className="text-lg font-semibold text-black dark:text-white">SpaceNet Testbed</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <ThemeToggle className="text-black hover:text-black/80 dark:text-white dark:hover:text-white/80" />
            <Link href="/experiments">
              <Button className="bg-vt-maroon hover:bg-vt-maroon-hover text-white">
                Open App
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

