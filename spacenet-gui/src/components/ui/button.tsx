import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'outline' is a deprecated alias for 'secondary' (kept for frozen legacy call sites). */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-btn font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          variant === 'primary' && 'bg-vt-maroon text-white hover:bg-vt-maroon-hover active:bg-vt-maroon-pressed',
          (variant === 'secondary' || variant === 'outline') && 'border border-light-border dark:border-dark-border bg-transparent hover:bg-light-bg dark:hover:bg-dark-surface',
          variant === 'ghost' && 'hover:bg-light-bg dark:hover:bg-dark-surface',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
