'use client'

import Link from 'next/link'
import { Save, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExperimentEditFooterProps {
  hasUnsavedChanges: boolean
  saving: boolean
  savingAndRunning: boolean
  onRestore: () => void
  onSave: () => void
  onSaveAndRun: () => void
}

export function ExperimentEditFooter({
  hasUnsavedChanges,
  saving,
  savingAndRunning,
  onRestore,
  onSave,
  onSaveAndRun,
}: ExperimentEditFooterProps) {
  if (!hasUnsavedChanges) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border p-4 z-40">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between">
        <span className="text-sm text-light-text/60 dark:text-dark-subtext">Unsaved changes</span>
        <div className="flex gap-2">
          <Link href="/experiments">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button variant="secondary" onClick={onRestore} disabled={saving}>
            Restore Changes
          </Button>
          <Button onClick={onSave} variant="primary" disabled={saving}>
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            className="bg-vt-orange hover:bg-vt-orange-hover active:bg-vt-orange-pressed text-white"
            onClick={onSaveAndRun}
            disabled={saving || savingAndRunning}
          >
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />
            {savingAndRunning ? 'Saving...' : 'Save & Run Simulation'}
          </Button>
        </div>
      </div>
    </div>
  )
}
