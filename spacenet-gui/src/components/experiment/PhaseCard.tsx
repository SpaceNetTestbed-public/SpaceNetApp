'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Download, FileText, CheckCircle2, AlertTriangle, ChevronDown, Terminal, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export interface PhaseProgressInfo {
  /** Human-readable current step (parsed from the simulator's log stream) */
  step: string
  /** ms-since-epoch when the phase began (used to render elapsed time) */
  startedAt: number
  /** Latest non-empty stdout line — shown in monospace for debug context */
  lastLine: string
  /** Last N stdout lines (oldest → newest) for the expandable live console */
  logTail: string[]
  /** Estimated completion 0–100 */
  percent: number
  /** Optional sub-label, e.g. "2 / 3 timesteps" */
  detail?: string
}

interface PhaseCardProps {
  id: string
  phase: 1 | 2
  hasOutput: boolean
  isSubmitting: boolean
  canRun: boolean // Phase 2 requires Phase 1
  isPolling?: boolean
  /** Live progress info shown when isPolling is true. Null hides the strip. */
  progress?: PhaseProgressInfo | null
  /** Cancel the tracked job while this phase is polling */
  onCancel?: () => void
  onRun: () => void
  onDownload: () => void
  onLogs: () => void
  onViewGif?: () => void
  showGifButton?: boolean
  hasMN: boolean
  onCreateAniGif?: () => void
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}m ${sec.toString().padStart(2, '0')}s`
}

export function PhaseCard({
  id,
  phase,
  hasOutput,
  isSubmitting,
  canRun,
  isPolling = false,
  progress = null,
  onCancel,
  onRun,
  onDownload,
  onLogs,
  onViewGif,
  showGifButton = false,
  hasMN = true,
  onCreateAniGif
}: PhaseCardProps) {
  // Local 1-second ticker so the elapsed timer updates smoothly instead of
  // jumping in 3-second chunks with the parent's polling interval. Only
  // ticks while the phase is actually running to avoid needless renders.
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    if (!isPolling || !progress) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isPolling, progress])

  // Expandable live-log console (collapsed by default to keep the card compact).
  const [showLogTail, setShowLogTail] = useState(false)
  const logTailRef = useRef<HTMLDivElement | null>(null)
  const logTail = progress?.logTail ?? []
  // Keep the console pinned to the newest line as fresh output streams in.
  useEffect(() => {
    if (showLogTail && logTailRef.current) {
      logTailRef.current.scrollTop = logTailRef.current.scrollHeight
    }
  }, [showLogTail, logTail])

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Phase {phase}</h2>
        {isPolling && (
          <Badge variant="info" pulse className="uppercase tracking-wider text-[10px] font-bold">
            Running
          </Badge>
        )}
        {!isPolling && hasOutput && (
          <Badge variant="success" className="uppercase tracking-wider text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Output Ready
          </Badge>
        )}
      </div>
      {isPolling && progress && (
        <div
          className="rounded-md border border-vt-orange/40 bg-vt-orange/5 dark:bg-vt-orange/10 px-3 py-2 space-y-1"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-light-text dark:text-dark-text">
              {progress.step}
            </span>
            <span className="text-[11px] font-mono text-light-text/60 dark:text-dark-subtext tabular-nums">
              {formatElapsed(now - progress.startedAt)}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[10px] text-light-text/60 dark:text-dark-subtext">
              <span>{progress.detail ?? 'Progress'}</span>
              <span className="tabular-nums font-medium">{progress.percent}%</span>
            </div>
            <div
              className="h-1.5 w-full rounded-full bg-light-border dark:bg-dark-border overflow-hidden"
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Phase ${phase} progress`}
            >
              <div
                className="h-full rounded-full bg-vt-orange transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
              />
            </div>
          </div>
          {progress.lastLine && !showLogTail && (
            <p
              className="text-[11px] font-mono text-light-text/50 dark:text-dark-subtext/80 truncate"
              title={progress.lastLine}
            >
              {progress.lastLine}
            </p>
          )}
          {logTail.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLogTail((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-medium text-vt-orange hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vt-orange rounded"
              aria-expanded={showLogTail}
              aria-label={showLogTail ? 'Hide live log' : 'Show live log'}
            >
              <Terminal className="h-3 w-3" aria-hidden="true" />
              {showLogTail ? 'Hide live log' : 'Show live log'}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showLogTail ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
          {showLogTail && logTail.length > 0 && (
            <div
              ref={logTailRef}
              className="mt-1 max-h-40 overflow-auto rounded bg-slate-900 dark:bg-black/60 p-2 font-mono text-[11px] leading-relaxed text-slate-200"
              role="log"
              aria-live="off"
            >
              {logTail.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-words">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-light-text/60 dark:text-dark-subtext">
        {phase === 1
          ? 'Initial constellation generation and preprocessing.'
          : 'Optimization and output generation.'}
      </p>
      <p className="text-sm text-light-text/60 dark:text-dark-subtext">
        {hasOutput && phase === 1
          && `Output could be found in the spacenet-backend folder under local_workspace/${id}/output`
        }
      </p>
      <p className="text-sm text-light-text/60 dark:text-dark-subtext">
        {hasOutput && phase === 2
          && `Output could be found in the spacenet-backend folder under local_workspace/${id}}/output_mn`
        }
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={onRun}
          disabled={isSubmitting || isPolling || !canRun || (!hasMN && phase === 2)}
          aria-label={isPolling ? `Phase ${phase} is running` : `Run Phase ${phase}`}
        >
          <Play className="h-4 w-4 mr-2" aria-hidden="true" />
          {isPolling ? `Running Phase ${phase}…` : `Run Phase ${phase}`}
        </Button>
        {hasOutput && !showGifButton && phase === 1 &&  (
          <Button variant="secondary" onClick={onCreateAniGif}>
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />Run GIF
          </Button>
        )}
        {showGifButton && onViewGif && (
          <Button variant="primary" onClick={onViewGif}>View GIF</Button>
        )}
        {showGifButton && phase === 1 && onCreateAniGif && (
          <Button variant="secondary" size="sm" onClick={onCreateAniGif}>
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />Regenerate GIF
          </Button>
        )}
        {hasOutput && (
          <Button variant="secondary" onClick={onDownload} aria-label={`Download Phase ${phase} output`}>
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Download
          </Button>
        )}
        <Button variant="secondary" onClick={onLogs} aria-label={`View Phase ${phase} logs`}>
          <FileText className="h-4 w-4 mr-2" aria-hidden="true" />Logs
        </Button>
        {isPolling && onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
            aria-label={`Cancel Phase ${phase}`}
          >
            <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Cancel
          </Button>
        )}
      </div>
      {phase === 2 && !canRun && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Requires Phase 1 output to run
        </p>
      )}
      {phase === 2 && !hasMN && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Requires main-mn to be configured
        </p>
      )}
    </Card>
  )
}
