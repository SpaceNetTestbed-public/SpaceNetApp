'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  const value = controlledValue ?? internalValue
  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('inline-flex h-10 items-center justify-center rounded-btn bg-light-bg dark:bg-dark-surface p-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  const isActive = context.value === value

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-btn px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isActive
          ? 'bg-white dark:bg-dark-bg text-light-text dark:text-dark-text shadow-sm'
          : 'text-light-text/60 dark:text-dark-subtext hover:text-light-text dark:hover:text-dark-text',
        className
      )}
      onClick={() => context.onValueChange(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  if (context.value !== value) return null

  return <div className={cn('mt-2', className)}>{children}</div>
}

