import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded bg-light-border dark:bg-dark-border', className)}
      {...props}
    />
  )
}

/**
 * Screen-reader announcement to pair with visual skeletons, e.g.
 * <SkeletonStatus>Loading jobs…</SkeletonStatus>
 */
function SkeletonStatus({ children }: { children: React.ReactNode }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {children}
    </span>
  )
}

export { Skeleton, SkeletonStatus }
