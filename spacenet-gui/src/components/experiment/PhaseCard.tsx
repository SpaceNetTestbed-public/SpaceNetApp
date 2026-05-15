'use client'

import { Play, Download, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhaseCardProps {
  phase: 1 | 2
  hasOutput: boolean
  isSubmitting: boolean
  canRun: boolean // Phase 2 requires Phase 1
  isPolling?: boolean
  onRun: () => void
  onDownload: () => void
  onLogs: () => void
  onViewGif?: () => void
  showGifButton?: boolean
  hasMN: boolean
  onCreateAniGif?: () => void
}

export function PhaseCard({
  phase,
  hasOutput,
  isSubmitting,
  canRun,
  isPolling = false,
  onRun,
  onDownload,
  onLogs,
  onViewGif,
  showGifButton = false,
  hasMN = true,
  onCreateAniGif
}: PhaseCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Phase {phase}</h2>
        {isPolling && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Running
          </span>
        )}
        {!isPolling && hasOutput && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
            <CheckCircle2 className="h-3 w-3" /> Output Ready
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        {phase === 1
          ? 'Initial constellation generation and preprocessing.'
          : 'Optimization and output generation.'}
      </p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={onRun} disabled={isSubmitting || !canRun || (!hasMN && phase === 2)}>
          <Play className="h-4 w-4 mr-2" />Run Phase {phase}
        </Button>
        {hasOutput && !showGifButton && phase === 1 &&  (
          <Button variant="outline" onClick={onCreateAniGif}>
            <Play className="h-4 w-4 mr-2" />Run GIF
          </Button>
        )}
        {showGifButton && onViewGif && (
          <Button onClick={onViewGif}>View GIF</Button>
        )}
        {hasOutput && (
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
        <Button variant="outline" onClick={onLogs}>
          <FileText className="h-4 w-4 mr-2" />Logs
        </Button>
      </div>
      {phase === 2 && !canRun && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" /> Requires Phase 1 output to run
        </p>
      )}
      {phase === 2 && !hasMN && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" /> Requires main-mn to be configured
        </p>
      )}
    </div>
  )
}
