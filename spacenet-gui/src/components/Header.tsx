'use client'
import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

export function Header(){
  return (
    <header className="h-16 sticky top-0 z-40 bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur border-b border-light-border dark:border-dark-border">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        <Link href="/experiments" className="font-semibold text-light-text dark:text-dark-text">SpaceNet Testbed</Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
