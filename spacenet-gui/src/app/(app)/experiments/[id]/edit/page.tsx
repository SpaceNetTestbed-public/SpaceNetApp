'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SatConfigForm } from '@/components/experiment-config/SatConfigForm'
import { MainConfigForm } from '@/components/experiment-config/MainConfigForm'
import { ExperimentConfig, SatConfig, MainConfig } from '@/types/experiment-config'
import { Experiment } from '@/types/types'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { generateMainYAML, generateSatYAML } from '@/lib/yaml'
import { ExperimentEditHeader } from '@/components/experiment/ExperimentEditHeader'
import { ExperimentMetadataForm } from '@/components/experiment/ExperimentMetadataForm'
import { ExperimentEditFooter } from '@/components/experiment/ExperimentEditFooter'
import { useExperimentSave } from '@/hooks/useExperimentSave'

export default function EditExperimentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState('sat-config')
  const [config, setConfig] = useState<ExperimentConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<ExperimentConfig | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appName, setAppName] = useState('Ping')
  const [originalAppName, setOriginalAppName] = useState('Ping')

  const { saving, savingAndRunning, setSavingAndRunning, handleSave } = useExperimentSave({
    id,
    appName,
    onSuccess: () => setHasUnsavedChanges(false),
  })

  useEffect(() => {
    // TODO: Fetch from API
    const fetchExperiment = async () => {
      try {
        const data = await apiFetch(`/experiments/${id}`) as Experiment
        const satConfigData = await apiFetch(`/experiments/${id}/sat`) as SatConfig
        const mainConfigData = await apiFetch(`/experiments/${id}/main`) as MainConfig
        const mainMnConfigData = await apiFetch(`/experiments/${id}/main-mn`) as { AppName: string }
        setAppName(mainMnConfigData.AppName)
        setOriginalAppName(mainMnConfigData.AppName)
        setConfig({
          experimentName: data.name,
          description: data.description ?? "",
          tags: data.tags ?? [],
          satConfig: satConfigData,
          mainConfig: mainConfigData,
          id: data.id,
          isNew: false,
          hasBeenRun: false, // TODO: Check if experiment has been run
        })

        setOriginalConfig({
          experimentName: data.name,
          description: data.description ?? "",
          tags: data.tags ?? [],
          satConfig: satConfigData,
          mainConfig: mainConfigData,
          id: data.id,
          isNew: false,
          hasBeenRun: false, // TODO: Check if experiment has been run
        })
      } catch (err) {
        console.error("Failed to load experiment:", err)
        toast.error(getApiErrorMessage(err, 'Failed to load experiment'), { id: 'experiment-load' })
      } finally {
        setLoading(false)
      }
    }
    fetchExperiment()
    setLoading(false)
  }, [id])

  if (loading || !config) {
    return (
      <div className="min-h-screen p-6 sm:p-8 flex items-center justify-center">
        <div className="text-light-text/60 dark:text-dark-subtext">Loading...</div>
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

  const handleSaveAndRun = async () => {
    if (!config?.experimentName.trim()) {
      toast.error('Experiment name is required')
      return
    }

    setSavingAndRunning(true)
    try {
      const ok = await handleSave(config)
      if (ok) router.push(`/experiments/${id}/simulate`)
    } finally {
      setSavingAndRunning(false)
    }
    // TODO: Start simulation via API
  }

  const handleImportYAML = () => {
    toast.info('YAML import coming soon')
  }

  const handleExportYAML = () => {
    if (!config) return
    const satYAML = generateSatYAML(config.satConfig, {
      includeOperatorName: true,
      shells: config.satConfig.shells,
      defaultPerturber: true,
    })
    const mainYAML = generateMainYAML(config.mainConfig)
    const blob = new Blob([`# SAT Config\n${satYAML}\n\n# Main Config\n${mainYAML}`], {
      type: 'text/yaml',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.experimentName || 'experiment'}.yaml`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('YAML exported')
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
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
            tleLocked={config.hasBeenRun || false}
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
                className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
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

