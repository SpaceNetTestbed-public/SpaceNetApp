'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function fieldClasses(hasError: boolean): string {
  return cn(
    'w-full px-3 py-2 rounded-btn border text-sm',
    'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text',
    'placeholder:text-light-text/40 dark:placeholder:text-dark-subtext/60',
    'focus:outline-none focus:ring-2 focus:ring-vt-maroon/50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-red-500 dark:border-red-500'
      : 'border-light-border dark:border-dark-border'
  )
}

interface FieldWrapperProps {
  label?: React.ReactNode
  error?: string
  helperText?: string
}

function useFieldIds(id: string | undefined, error?: string, helperText?: string) {
  const autoId = React.useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  const helperId = `${fieldId}-helper`
  const describedBy =
    [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') || undefined
  return { fieldId, errorId, helperId, describedBy }
}

function FieldMessages({
  error,
  helperText,
  errorId,
  helperId,
}: FieldWrapperProps & { errorId: string; helperId: string }) {
  return (
    <>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && (
        <p id={helperId} className="mt-1 text-sm text-light-text/60 dark:text-dark-subtext">
          {helperText}
        </p>
      )}
    </>
  )
}

function FieldLabel({ label, fieldId }: { label?: React.ReactNode; fieldId: string }) {
  if (!label) return null
  return (
    <label
      htmlFor={fieldId}
      className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text"
    >
      {label}
    </label>
  )
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    FieldWrapperProps {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const { fieldId, errorId, helperId, describedBy } = useFieldIds(id, error, helperText)
    return (
      <div className="w-full">
        <FieldLabel label={label} fieldId={fieldId} />
        <input
          id={fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClasses(Boolean(error)), className)}
          {...props}
        />
        <FieldMessages error={error} helperText={helperText} errorId={errorId} helperId={helperId} />
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldWrapperProps {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const { fieldId, errorId, helperId, describedBy } = useFieldIds(id, error, helperText)
    return (
      <div className="w-full">
        <FieldLabel label={label} fieldId={fieldId} />
        <textarea
          id={fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClasses(Boolean(error)), className)}
          {...props}
        />
        <FieldMessages error={error} helperText={helperText} errorId={errorId} helperId={helperId} />
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Input, Textarea }
