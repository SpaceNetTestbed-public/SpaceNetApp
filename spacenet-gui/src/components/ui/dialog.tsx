'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface DialogContextValue {
  titleId: string
  onClose: () => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(component: string): DialogContextValue {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error(`${component} must be used inside <Dialog>`)
  return ctx
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Overrides for the panel, e.g. max-width (`max-w-2xl`). */
  className?: string
}

function Dialog({ open, onClose, children, className }: DialogProps) {
  const titleId = React.useId()
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  // Callers pass onClose as an inline arrow, so its identity changes on every
  // parent render. Keeping it in the effect's dep list re-ran the focus setup
  // on each keystroke, moving focus out of whatever input was being typed in.
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  })

  React.useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
      data-testid="dialog-backdrop"
    >
      <DialogContext.Provider value={{ titleId, onClose }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-card shadow-modal-3',
            'bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border',
            'focus:outline-none',
            className
          )}
        >
          {children}
        </motion.div>
      </DialogContext.Provider>
    </div>
  )
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Renders an X close button on the right (default true). */
  showClose?: boolean
}

function DialogHeader({ className, showClose = true, children, ...props }: DialogHeaderProps) {
  const { onClose } = useDialogContext('DialogHeader')
  return (
    <div className={cn('flex items-start justify-between gap-4 p-6 pb-4', className)} {...props}>
      <div className="flex-1 min-w-0">{children}</div>
      {showClose && (
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="-mr-2 -mt-1 px-2">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogContext('DialogTitle')
  return (
    <h2
      id={titleId}
      className={cn('text-lg font-semibold text-light-text dark:text-dark-text', className)}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-4', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-3 p-6 pt-2', className)} {...props} />
}

export { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter }
