'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Root error boundary caught:', error)
    }
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-card border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-light-text dark:text-dark-text mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-light-text/70 dark:text-dark-subtext mb-6">
          An unexpected error occurred. You can try again, or return to the experiments list.
        </p>
        {error.digest && (
          <p className="text-xs text-light-text/40 dark:text-dark-subtext/60 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/experiments">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Back to experiments
            </Button>
          </Link>
          <Button
            onClick={reset}
            className="bg-maroon hover:bg-maroon-hover text-white w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
