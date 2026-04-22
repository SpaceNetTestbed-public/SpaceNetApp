import { useState, useCallback } from 'react'
import { ExperimentConfig } from '@/types/experiment-config'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { validateExperimentConfig } from '@/lib/experiment-validation'

interface UseExperimentSaveProps {
  id: string
  appName: string
  onSuccess?: () => void
}

export function useExperimentSave({ id, appName, onSuccess }: UseExperimentSaveProps) {
  const [saving, setSaving] = useState(false)
  const [savingAndRunning, setSavingAndRunning] = useState(false)

  const handleSave = useCallback(async (config: ExperimentConfig | null): Promise<boolean> => {
    if (!config) return false
    
    if (!validateExperimentConfig(config)) {
      return false
    }

    if (saving) return false

    setSaving(true)

    const payload = {
      ...config,
      description: config.description?.trim() || null,
      tag: config.tag?.trim() || null,
      satConfig: (() => {
        const { TLEFilePath, generate_TLE, ...rest } = config.satConfig
        return {
          ...rest,
          shells: Object.fromEntries(
            Object.entries(rest.shells ?? {}).map(([key, shell]) => {
              if (shell.perturber === 'None') {
                const { perturber, ...shellWithoutPerturber } = shell
                return [key, shellWithoutPerturber]
              }
              return [key, shell]
            })
          ),
        }
      })(),
      mainConfig: (() => {
        const {
          ConstellationName,
          GroundStationFile,
          OutputFilePath,
          Azure,
          Gateways,
          WonderProxy,
          ...restMain
        } = config.mainConfig;
      
        // Clean nested Azure fields
        const {
          t2t_azure_dict_output_file,
          t2t_azure_endpoint_latency_url,
          t2t_azure_endpoint_location_file,
          ...cleanAzure
        } = Azure ?? {};
      
        // Clean nested Gateways fields
        const {
          t2t_dict_output_file,
          ...cleanGateways
        } = Gateways ?? {};
      
        // Clean nested WonderProxy fields
        const {
          t2t_wonderproxy_dict_output_file,
          t2t_wonderproxy_endpoint_latency_file,
          t2t_wonderproxy_endpoint_location_file,
          ...cleanWonderProxy
        } = WonderProxy ?? {};
      
        return {
          ...restMain,
          Azure: cleanAzure,
          Gateways: cleanGateways,
          WonderProxy: cleanWonderProxy,
        };
      })(),      
    }

    const mainMnPayload = {
      AppName: appName,
      CLIIntervalCount: 3,
      CLIStartInterval: 0,
      DeleteAppResults: false,
      DestDeviceName: payload.mainConfig.DestNode,
      DynamicLinkQueueSize: true,
      MonitorResource: false,
      Optimize: true,
      PauseAtIntervalChange: true,
      PrePing: true,
      R2Q: 1,
      SimTimeMode: 'discrete',
      SourceDeviceName: payload.mainConfig.SourceNode,
      Verbose: true
    }
  
    try {
      // Save SAT config
      await apiFetch(`/experiments/${id}/sat`, {
        method: "PUT",
        body: JSON.stringify(payload.satConfig),
        headers: { "Content-Type": "application/json" }
      })
  
      // Save metadata (name, description, tag)
      await apiFetch(`/experiments/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: payload.experimentName,
          description: payload.description,
          tags: payload.tags,
        }),
        headers: { "Content-Type": "application/json" }
      })

      await apiFetch(`/experiments/${id}/main`, {
        method: "PUT",
        body: JSON.stringify(payload.mainConfig),
        headers: { "Content-Type": "application/json" }
      })

      await apiFetch(`/experiments/${id}/main-mn`, {
        method: "PUT",
        body: JSON.stringify(mainMnPayload),
        headers: { "Content-Type": "application/json" }
      })
  
      toast.success("Configuration saved")
      onSuccess?.()
      return true
  
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to save configuration'), { id: 'experiment-save-config' })
      return false
    } finally {
      setSaving(false)
    }
  }, [id, appName, onSuccess])

  return {
    saving,
    savingAndRunning,
    setSavingAndRunning,
    handleSave,
  }
}
