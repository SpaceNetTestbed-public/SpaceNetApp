'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, X, Play, SlidersHorizontal, Orbit, Loader2, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface VisualizationPanelProps {
  hasOutput: boolean
  outputChecked: boolean
  htmlContent: string | null
  timeSteps: number[]
  timeStepIndex: number
  onTimeStepChange: (index: number) => void
  shellNames: string[]
  shellColors: Record<string, string>
  onShellColorChange: (shell: string, color: string) => void
  isSubmitting: boolean
  /** True while the plot job is queued or rendering (includes auto-run after Phase 1) */
  isGenerating?: boolean
  /** Shown when visualization fails or times out */
  vizError?: string | null
  onCreateGif: () => void
  /** Cancel the in-flight plot job — only passed while one is running */
  onCancel?: () => void
  onDownload: () => void
  shellColorOptions: string[]
}

// Visual swatch for each named color option so the dropdown shows what the
// selection actually looks like on the plot.
const COLOR_SWATCHES: Record<string, string> = {
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  purple: '#a855f7',
  cyan: '#06b6d4',
  yellow: '#eab308',
  pink: '#ec4899',
  white: '#f8fafc',
  gray: '#9ca3af',
}

const SELECT_CLASSES =
  'w-full appearance-none rounded-btn border border-light-border dark:border-dark-border ' +
  'bg-light-surface dark:bg-dark-bg text-sm text-light-text dark:text-dark-text ' +
  'px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent ' +
  'transition-colors cursor-pointer'

export function VisualizationPanel({
  hasOutput,
  outputChecked,
  htmlContent,
  timeSteps,
  timeStepIndex,
  onTimeStepChange,
  shellNames,
  shellColors,
  onShellColorChange,
  isSubmitting,
  isGenerating = false,
  vizError = null,
  onCreateGif,
  onCancel,
  onDownload,
  shellColorOptions,
}: VisualizationPanelProps) {
  const router = useRouter()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!htmlContent) return
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [htmlContent])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ==================== Visualization ==================== */}
      <Card className="lg:col-span-2 overflow-hidden">
        {!outputChecked ? (
          <div className="flex flex-col items-center justify-center gap-3 h-[600px] text-light-text/60 dark:text-dark-subtext">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            <span className="text-sm font-medium">Checking for output…</span>
          </div>
        ) : hasOutput && blobUrl ? (
          <iframe
            src={blobUrl}
            sandbox="allow-scripts"
            className="w-full h-[1050px]"
            title="Visualization output"
          />
        ) : isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-4 h-[600px] text-light-text/70 dark:text-dark-subtext">
            <Loader2 className="h-10 w-10 animate-spin text-vt-orange" aria-hidden="true" />
            <div className="text-center space-y-1">
              <p className="text-base font-medium text-light-text dark:text-dark-text">
                Rendering globe visualization…
              </p>
              <p className="text-sm max-w-sm">
                Building the 3D plot from Phase 1 output. This usually takes under a minute.
              </p>
            </div>
            {onCancel && (
              <Button
                variant="secondary"
                onClick={onCancel}
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                aria-label="Cancel visualization"
              >
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Cancel
              </Button>
            )}
          </div>
        ) : vizError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Could not render visualization"
            description={vizError}
            action={
              <Button variant="primary" onClick={onCreateGif}>
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                Retry visualization
              </Button>
            }
            className="h-[600px] py-0"
          />
        ) : (
          <EmptyState
            icon={Orbit}
            title="No visualization yet"
            description="The globe will appear automatically after Phase 1 completes, or click Run Visualization on the right."
            action={
              <Button variant="primary" onClick={onCreateGif}>
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                Run Visualization
              </Button>
            }
            className="h-[600px] py-0"
          />
        )}
      </Card>

      {/* ==================== Controls ==================== */}
      <Card className="p-6 space-y-5 sticky top-6">
        <div className="flex items-center gap-2 pb-1">
          <SlidersHorizontal className="h-4 w-4 text-vt-maroon dark:text-vt-orange" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Visualization Settings
          </h2>
        </div>

        {/* Time Step */}
        <div className="space-y-2">
          <label htmlFor="viz-timestep" className="text-sm font-medium text-light-text dark:text-dark-text block">
            Time Step
          </label>
          <select
            id="viz-timestep"
            value={timeStepIndex}
            onChange={(e) => onTimeStepChange(Number(e.target.value))}
            className={SELECT_CLASSES}
          >
            {timeSteps.map((t, i) => (
              <option key={i} value={i}>
                t = {t}s
              </option>
            ))}
          </select>
        </div>

        {/* Shell Colors */}
        {shellNames.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-light-text dark:text-dark-text">Shell Colors</p>
            {shellNames.map((shell) => (
              <div key={shell} className="space-y-1.5">
                <label
                  htmlFor={`viz-color-${shell}`}
                  className="text-xs text-light-text/70 dark:text-dark-subtext block capitalize"
                >
                  {shell}
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20"
                    style={{ backgroundColor: COLOR_SWATCHES[shellColors[shell]] ?? '#9ca3af' }}
                    aria-hidden="true"
                  />
                  <select
                    id={`viz-color-${shell}`}
                    value={shellColors[shell]}
                    onChange={(e) => onShellColorChange(shell, e.target.value)}
                    className={SELECT_CLASSES + ' pl-9 capitalize'}
                  >
                    {shellColorOptions.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2 border-t border-light-border dark:border-dark-border">
          <Button className="w-full mt-3" onClick={onCreateGif} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                Run Visualization
              </>
            )}
          </Button>
          {isGenerating && onCancel && (
            <Button
              variant="secondary"
              className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
              onClick={onCancel}
              aria-label="Cancel visualization"
            >
              <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              Cancel
            </Button>
          )}
          {hasOutput && (
            <Button variant="secondary" className="w-full" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Download Output (.zip)
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => router.push('/experiments')}>
            <X className="h-4 w-4 mr-2" aria-hidden="true" />
            Exit
          </Button>
        </div>
      </Card>
    </div>
  )
}
