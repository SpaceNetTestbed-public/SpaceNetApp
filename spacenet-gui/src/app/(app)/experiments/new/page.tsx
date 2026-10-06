'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Play, Upload, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SatConfigForm } from '@/components/experiment-config/SatConfigForm'
import { MainConfigForm } from '@/components/experiment-config/MainConfigForm'
import { ExperimentConfig, defaultSatConfig, defaultMainConfig } from '@/types/experiment-config'
import { generateMainYAML, generateSatYAML } from '@/lib/yaml'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function NewExperimentPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('sat-config')
  const [config, setConfig] = useState<ExperimentConfig>({
    experimentName: '',
    operatorType: 'Starlink',
    description: '',
    tags: [],
    satConfig: defaultSatConfig,
    mainConfig: defaultMainConfig,
    isNew: true,
    hasBeenRun: false,
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)

  const nameError =
    nameTouched && !config.experimentName.trim() ? 'Experiment name is required' : undefined

  const updateConfig = (updates: Partial<ExperimentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (!config.experimentName.trim()) {
      setNameTouched(true)
      toast.error('Experiment name is required')
      return
    }

    setIsSaving(true)
    try {
      // TODO: Save to backend API
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success('Profile saved')
      setHasUnsavedChanges(false)
      // TODO: Navigate to experiments list or edit page
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndRun = async () => {
    if (!config.experimentName.trim()) {
      setNameTouched(true)
      toast.error('Experiment name is required')
      return
    }

    await handleSave()
    toast.success(`Simulation started for ${config.experimentName}`)
    // TODO: Start simulation via API
  }

  const handleImportYAML = () => {
    toast.info('YAML import coming soon')
    // TODO: Implement YAML import
  }

  const handleExportYAML = () => {
    // Generate YAML strings
    const satYAML = generateSatYAML(config.satConfig)
    const mainYAML = generateMainYAML(config.mainConfig)

    // Create download
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
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/experiments">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text">
            Create New Experiment
          </h1>
          <p className="text-sm text-light-text/60 dark:text-dark-subtext mt-2">
            Configure your satellite constellation and simulation parameters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleImportYAML}>
            <Upload className="h-4 w-4 mr-2" />
            Import YAML
          </Button>
          <Button variant="secondary" onClick={handleExportYAML}>
            <Download className="h-4 w-4 mr-2" />
            Export YAML
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {isSaving ? 'Saving…' : 'Save Configuration'}
          </Button>
          <Button
            className="bg-vt-orange hover:bg-vt-orange-hover active:bg-vt-orange-pressed text-white"
            onClick={handleSaveAndRun}
            disabled={isSaving}
          >
            <Play className="h-4 w-4 mr-2" aria-hidden="true" />
            Save & Run Simulation
          </Button>
          <Link href="/experiments" aria-label="Back to experiments">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Back to experiments">
              <X className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6 mb-6"
      >
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Profile Metadata
        </h2>
        <div className="space-y-4">
          <Input
            type="text"
            label={<>Experiment Name <span className="text-red-500" aria-hidden="true">*</span></>}
            value={config.experimentName}
            onChange={(e) => updateConfig({ experimentName: e.target.value })}
            onBlur={() => setNameTouched(true)}
            error={nameError}
            required
            placeholder="e.g., Starlink_Gen2_Test"
            className="bg-light-bg dark:bg-dark-bg"
          />
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Operator Type <span className="text-red-500">*</span>
            </label>
            <select
              value={config.operatorType}
              onChange={(e) => updateConfig({ operatorType: e.target.value as ExperimentConfig['operatorType'] })}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            >
              <option value="Starlink">Starlink</option>
              <option value="OneWeb">OneWeb</option>
              <option value="Amazon Kuiper">Amazon Kuiper</option>
              <option value="Custom Operator">Custom Operator</option>
              <option value="Test Network">Test Network</option>
            </select>
          </div>
          <Textarea
            label="Description"
            value={config.description}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="Enter experiment description..."
            rows={3}
            className="bg-light-bg dark:bg-dark-bg resize-none"
          />
          <Input
            type="text"
            label="Tags (comma-separated)"
            value={(config.tags ?? []).join(', ')}
            onChange={(e) => {
              const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
              updateConfig({ tags })
            }}
            placeholder="e.g., Phase 1, Production, Experimental"
            helperText="Tags group experiments on the projects page."
            className="bg-light-bg dark:bg-dark-bg"
          />
        </div>
      </motion.div>

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
            isNew
          />
        </TabsContent>

        <TabsContent value="main-config">
          <MainConfigForm
            config={config.mainConfig}
            onChange={(mainConfig) => updateConfig({ mainConfig })}
          />
        </TabsContent>
      </Tabs>

      {/* Footer with save buttons */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border p-4 z-40">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between">
            <span className="text-sm text-light-text/60 dark:text-dark-subtext">Unsaved changes</span>
            <div className="flex gap-2">
              <Link href="/experiments">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                className="bg-vt-orange hover:bg-vt-orange-hover active:bg-vt-orange-pressed text-white"
                onClick={handleSaveAndRun}
                disabled={isSaving}
              >
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                Save & Run Simulation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

