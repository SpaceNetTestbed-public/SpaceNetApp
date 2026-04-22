'use client'

import { Button } from '@/components/ui/button'

interface LogsModalProps {
  isOpen: boolean
  phase: 1 | 2 | null
  logs: string
  loading: boolean
  onClose: () => void
}

export function LogsModal({ isOpen, phase, logs, loading, onClose }: LogsModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-light-surface dark:bg-dark-surface border w-full max-w-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Phase {phase} Logs</h2>
        <pre className="h-[400px] overflow-auto bg-black text-green-400 p-4 text-sm font-mono">
          {loading ? 'Loading logs…' : logs}
        </pre>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
