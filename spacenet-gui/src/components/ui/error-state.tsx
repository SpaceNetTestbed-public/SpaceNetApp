'use client'

import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}
    >
      <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
      <p className="text-base font-medium text-light-text dark:text-dark-text">{title}</p>
      {message && (
        <p className="text-sm text-light-text/60 dark:text-dark-subtext max-w-md">{message}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export { ErrorState }
