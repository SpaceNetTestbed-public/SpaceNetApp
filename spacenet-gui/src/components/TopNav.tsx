'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Satellite, FileText, Info, Clock8, SatelliteDish, Orbit } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'


export function TopNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/experiments', label: 'Experiments', icon: FileText },
    { href: '/jobs', label: 'Jobs', icon: Clock8 },
    { href: '/tles', label: 'TLES', icon: Orbit },
    { href: '/ground-stations', label: 'Ground Stations', icon: SatelliteDish },
    { href: '/about', label: 'About', icon: Info },
  ]

  return (
    <>
      <nav className="border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">


            {/* Left: Logo */}
            <Link href="/experiments" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 rounded-xl bg-maroon flex items-center justify-center">
                <Satellite className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">
                SpaceNet Testbed
              </span>
            </Link>


            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link key={item.label} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`flex items-center gap-2 ${
                        isActive
                          ? 'text-maroon dark:text-maroon font-medium'
                          : 'text-light-text/70 dark:text-dark-subtext hover:text-light-text dark:hover:text-dark-text'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>


            {/* Right: Theme toggle */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>

          </div>
        </div>
      </nav>
    </>
  )
}
