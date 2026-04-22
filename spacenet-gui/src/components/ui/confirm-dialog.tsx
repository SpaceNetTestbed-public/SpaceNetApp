'use client'

import { motion } from 'framer-motion'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmLoadingLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmLoadingLabel = 'Working...',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  // Focus and keyboard handling for accessibility
  useEffect(() => {
    if (!isOpen) return

    // Focus primary action by default
    confirmButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      } else if (event.key === 'Enter') {
        // Only trigger when focus is inside the dialog
        const target = event.target as HTMLElement | null
        if (target && target.closest('[data-confirm-dialog-root="true"]')) {
          event.preventDefault()
          onConfirm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel, onConfirm])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-card shadow-xl p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        data-confirm-dialog-root="true"
      >
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <AlertTriangle className={`h-6 w-6 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
              {title}
            </h3>
            <p className="text-sm text-light-text/70 dark:text-dark-subtext">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className={variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
            }
            disabled={isConfirming}
            ref={confirmButtonRef}
          >
            {isConfirming ? confirmLoadingLabel : confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
