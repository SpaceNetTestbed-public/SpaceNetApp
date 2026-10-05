'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { SatConfigForm } from '@/components/experiment-config/SatConfigForm'
import { MainConfigForm } from '@/components/experiment-config/MainConfigForm'
import { ExperimentConfig, SatConfig, MainConfig } from '@/types/experiment-config'
import { Experiment } from '@/types/types'
import { toast } from 'sonner'
import { API_URL, apiFetch, ApiError } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { ExperimentEditHeader } from '@/components/experiment/ExperimentEditHeader'
import { ExperimentMetadataForm } from '@/components/experiment/ExperimentMetadataForm'
import { ExperimentEditFooter } from '@/components/experiment/ExperimentEditFooter'
import { useExperimentSave } from '@/hooks/useExperimentSave'

export default function EditExperimentPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  // Set by the create-experiment modal redirect (?new=true). Distinguishes
  // a freshly created experiment from one opened later via the experiments
  // list — the /experiments/new page is unused in the real creation flow.
  const isFreshCreate = searchParams.get('new') === 'true'
  const [activeTab, setActiveTab] = useState('sat-config')
  const [config, setConfig] = useState<ExperimentConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<ExperimentConfig | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [appName, setAppName] = useState('Ping')
  const [originalAppName, setOriginalAppName] = useState('Ping')

  const { saving, savingAndRunning, setSavingAndRunning, handleSave } = useExperimentSave({
    id,
    appName,
    onSuccess: () => setHasUnsavedChanges(false),
  })

  const fetchExperiment = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      // All fetches are independent — run in parallel. main-mn may not exist
      // yet for experiments that never configured Phase 2, so tolerate it failing.
      const [data, satConfigData, mainConfigData, mainMnConfigData] = await Promise.all([
        apiFetch(`/experiments/${id}`) as Promise<Experiment>,
        apiFetch(`/experiments/${id}/sat`) as Promise<SatConfig>,
        apiFetch(`/experiments/${id}/main`) as Promise<MainConfig>,
        (apiFetch(`/experiments/${id}/main-mn`) as Promise<{ AppName: string }>).catch(() => null),
      ])
      const loadedAppName = mainMnConfigData?.AppName ?? 'Ping'
      setAppName(loadedAppName)
      setOriginalAppName(loadedAppName)
      const hasBeenRun = data.hasPhase1 || data.hasPhase2
      const loaded: ExperimentConfig = {
        experimentName: data.name,
        description: data.description ?? "",
        tags: data.tags ?? [],
        satConfig: satConfigData,
        mainConfig: mainConfigData,
        id: data.id,
        isNew: isFreshCreate,
        hasBeenRun,
      }
      setConfig(loaded)
      setOriginalConfig(structuredClone(loaded))
    } catch (err) {
      // Expected 4xx responses (e.g. 404 for a deleted experiment) are
      // surfaced via ErrorState below — skip the console noise unless the
      // failure is unexpected (network error or 5xx).
      if (!(err instanceof ApiError) || err.status >= 500) {
        console.error("Failed to load experiment:", err)
      }
      setLoadError(getApiErrorMessage(err, 'Failed to load experiment'))
    } finally {
      // Keep setLoading here only — do NOT call it outside the async fn
      // or loading becomes false before data arrives (race condition).
      setLoading(false)
    }
  }, [id, isFreshCreate])

  useEffect(() => {
    void fetchExperiment()
  }, [fetchExperiment])

  if (loading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 space-y-6">
        <SkeletonStatus>Loading experiment…</SkeletonStatus>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-40 rounded-btn" />
            <Skeleton className="h-10 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-btn" />
            <Skeleton className="h-9 w-32 rounded-btn" />
            <Skeleton className="h-9 w-40 rounded-btn" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    )
  }

  if (loadError || !config) {
    return (
      <div className="min-h-screen p-6 sm:p-8 flex items-center justify-center">
        <ErrorState
          title="Failed to load experiment"
          message={loadError ?? undefined}
          onRetry={() => void fetchExperiment()}
        />
      </div>
    )
  }

  const handleRestore = () => {
    if (!originalConfig) return
    setConfig(structuredClone(originalConfig))
    setAppName(originalAppName)
    setHasUnsavedChanges(false)
    toast.info("Changes restored")
  }

  const updateConfig = (updates: Partial<ExperimentConfig>) => {
    setConfig((prev) => prev ? { ...prev, ...updates } : null)
    setHasUnsavedChanges(true)
  }

  const handleSaveAndRun = () => {
    if (!config?.experimentName.trim()) {
      toast.error('Experiment name is required')
      return
    }

    void executeSaveAndRun()
  }

  const executeSaveAndRun = async () => {
    setSavingAndRunning(true)
    try {
      const ok = await handleSave(config)
      if (!ok) return

      router.push(`/experiments/${id}/simulate`)
    } finally {
      setSavingAndRunning(false)
    }
  }

  const handleImportYAML = () => {
    toast.info('YAML import coming soon')
  }

  const handleExportYAML = async () => {
    if (!config) return
    try {
      const res = await fetch(`${API_URL}/experiments/${id}/download-config`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${config.experimentName || 'experiment'}_config.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('YAML exported')
    } catch (err) {
      console.error('YAML export failed:', err)
      toast.error(getApiErrorMessage(err, 'Failed to export YAML'), { id: 'yaml-export' })
    }
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 pb-28 sm:pb-32">
      <ExperimentEditHeader
        experimentName={config.experimentName}
        saving={saving}
        savingAndRunning={savingAndRunning}
        onImportYAML={handleImportYAML}
        onExportYAML={handleExportYAML}
        onRestore={handleRestore}
        onSave={() => handleSave(config)}
        onSaveAndRun={handleSaveAndRun}
      />

      {config.hasBeenRun && (
        <div className="mb-6 p-4 rounded-card bg-vt-orange/10 dark:bg-vt-orange/15 border border-vt-orange/30 dark:border-vt-orange/40 flex items-start gap-3" role="status">
          <AlertTriangle className="h-5 w-5 text-vt-orange shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-vt-orange-pressed dark:text-vt-orange">This experiment has already been run</p>
            <p className="text-xs text-vt-orange-pressed/80 dark:text-vt-orange/80 mt-0.5">
              Editing the satellite configuration may invalidate existing simulation results.
            </p>
          </div>
        </div>
      )}

      <ExperimentMetadataForm
        experimentName={config.experimentName}
        description={config.description}
        tags={config.tags}
        onExperimentNameChange={(value) => updateConfig({ experimentName: value })}
        onDescriptionChange={(value) => updateConfig({ description: value })}
        onTagsChange={(value) => updateConfig({ tags: value })}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="sat-config">SAT Config</TabsTrigger>
          <TabsTrigger value="main-config">Main Config</TabsTrigger>
        </TabsList>

        <TabsContent value="sat-config">
          <SatConfigForm
            config={config.satConfig}
            onChange={(satConfig) => updateConfig({ satConfig })}
            isNew={isFreshCreate}
          />
        </TabsContent>

        <TabsContent value="main-config" className="space-y-6">
          {/* Phase 2 config */}
          <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Phase 2 Configuration
            </h3>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
                App Name <span className="text-red-500">*</span>
              </label>
              <select
                value={appName}
                onChange={(e) => {setAppName(e.target.value); setHasUnsavedChanges(true)}}
                className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              >
                <option value="Ping">Ping</option>
                <option value="iPerf">iPerf</option>
                <option value="CLI">CLI</option>
              </select>
              <p className="text-xs text-light-text/60 dark:text-dark-subtext mt-1">
              </p>
            </div>
          </div>
          <MainConfigForm
            config={config.mainConfig}
            onChange={(mainConfig) => updateConfig({ mainConfig })}
          />
        </TabsContent>
      </Tabs>

      <ExperimentEditFooter
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        savingAndRunning={savingAndRunning}
        onRestore={handleRestore}
        onSave={() => handleSave(config)}
        onSaveAndRun={handleSaveAndRun}
      />
    </div>
  )
}

