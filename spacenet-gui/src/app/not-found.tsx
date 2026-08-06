import Link from 'next/link'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-card border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface p-8 text-center">
        <Compass className="h-12 w-12 mx-auto text-vt-maroon mb-4" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">404</h1>
        <p className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
          Page not found
        </p>
        <p className="text-sm text-light-text/70 dark:text-dark-subtext mb-6">
          We couldn&apos;t find the page you&apos;re looking for. It may have moved or never existed.
        </p>
        <Link href="/experiments">
          <Button className="bg-vt-maroon hover:bg-vt-maroon-hover text-white">
            <Home className="h-4 w-4 mr-2" aria-hidden="true" />
            Go to experiments
          </Button>
        </Link>
      </div>
    </div>
  )
}
