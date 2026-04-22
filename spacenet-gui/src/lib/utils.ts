import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get a user-friendly message from an API error for toasts.
 * apiFetch throws new Error(responseText), so we try to parse JSON (detail/message) or use the text.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (!msg || msg === 'Request failed') return fallback
  try {
    const parsed = JSON.parse(msg) as { detail?: string; message?: string; error?: string }
    const text = parsed.detail ?? parsed.message ?? parsed.error
    if (typeof text === 'string' && text.trim()) return text.trim()
  } catch {
    // not JSON, use raw message
  }
  return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg
}

