import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}
    >
      {Icon && (
        <Icon className="h-10 w-10 text-light-text/30 dark:text-dark-subtext/50" aria-hidden="true" />
      )}
      <p className="text-base font-medium text-light-text dark:text-dark-text">{title}</p>
      {description && (
        <p className="text-sm text-light-text/60 dark:text-dark-subtext max-w-md">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export { EmptyState }
