'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  onCreateGif: () => void
  onDownload: () => void
  shellColorOptions: string[]
}

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
  onCreateGif,
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visualization */}
      <div className="lg:col-span-2 h-[1050px] overflow-auto flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          {!outputChecked ? (
            <span>Checking for output…</span>
          ) : hasOutput && blobUrl ? (
            <iframe
              src={blobUrl}
              sandbox="allow-scripts"
              className="w-full h-full"
              title="Visualization output"
            />
          ) : (
            <span className="font-medium text-lg">No output generated</span>
          )}
        </div>
      </div>
      {/* Controls */}
      <div className="space-y-6 sticky top-6">
        {/* Time Step */}
        <div>
          <label className="text-sm font-medium mb-2 block">Time Step</label>
          <select
            value={timeStepIndex}
            onChange={(e) => onTimeStepChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-btn border"
          >
            {timeSteps.map((t, i) => (
              <option key={i} value={i}>
                t = {t}s
              </option>
            ))}
          </select>
        </div>
        {/* Shell Colors */}
        {shellNames.map((shell) => (
          <div key={shell}>
            <label className="text-sm font-medium mb-2 block">{shell} Color</label>
            <select
              value={shellColors[shell]}
              onChange={(e) => onShellColorChange(shell, e.target.value)}
              className="w-full px-3 py-2 rounded-btn border"
            >
              {shellColorOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
        ))}
        <Button className="w-full" onClick={onCreateGif} disabled={isSubmitting}>
          {isSubmitting ? 'Generating…' : 'Run Visualization'}
        </Button>
        {/* Download button */}
        {hasOutput && (
          <Button className="w-full" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Output (.zip)
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={() => router.push('/experiments')}>
          <X className="h-4 w-4 mr-2" />Exit
        </Button>
      </div>
    </div>
  )
}
