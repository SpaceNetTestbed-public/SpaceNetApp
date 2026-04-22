'use client'

import Link from 'next/link'
import { ArrowLeft, Save, Play, Upload, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExperimentEditHeaderProps {
  experimentName: string
  saving: boolean
  savingAndRunning: boolean
  onImportYAML: () => void
  onExportYAML: () => void
  onRestore: () => void
  onSave: () => void
  onSaveAndRun: () => void
}

export function ExperimentEditHeader({
  experimentName,
  saving,
  savingAndRunning,
  onImportYAML,
  onExportYAML,
  onRestore,
  onSave,
  onSaveAndRun,
}: ExperimentEditHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <Link href="/experiments">
          <Button variant="ghost" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text">
          Edit Configuration: {experimentName}
        </h1>
        <p className="text-sm text-light-text/60 dark:text-dark-subtext mt-2">
          Fields use backend defaults
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onImportYAML}>
          <Upload className="h-4 w-4 mr-2" />
          Import YAML
        </Button>
        <Button variant="outline" onClick={onExportYAML}>
          <Download className="h-4 w-4 mr-2" />
          Export YAML
        </Button>
        <Button variant="outline" onClick={onRestore} disabled={saving}>
          <X className="h-4 w-4 mr-2" />
          Restore Changes
        </Button>
        <Button variant="outline" onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={onSaveAndRun}
          disabled={saving || savingAndRunning}
        >
          <Play className="h-4 w-4 mr-2" />
          {savingAndRunning ? 'Saving...' : 'Save & Run Simulation'}
        </Button>
        <Link href="/experiments" aria-label="Back to experiments">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Back to experiments">
            <X className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
