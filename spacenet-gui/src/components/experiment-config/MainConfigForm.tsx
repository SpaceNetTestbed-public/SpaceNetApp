'use client'

import { MainConfig } from '@/types/experiment-config'
import type { GroundStationFileSummary, StationOption } from '@/types/types'
import { Button } from '../ui/button'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'

interface MainConfigFormProps {
  config: MainConfig
  onChange: (config: MainConfig) => void
}

export function MainConfigForm({ config, onChange }: MainConfigFormProps) {
  const [istnEnabled, setIstnEnabled] = useState(config.TopoCrit > 0)
  const [azureChecked, setAzureChecked] = useState(!!config.Azure?.t2t_use_azure)
  const [wonderProxyChecked, setWonderProxyChecked] = useState(!!config.WonderProxy?.t2t_use_wonderproxy)
  const [istnError, setIstnError] = useState('')
  const [gsFiles, setGsFiles] = useState<GroundStationFileSummary[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);

  useEffect(() => {
    const fetchGSFiles = async () => {
      try {
        const data = await apiFetch("/ground_station_file") as GroundStationFileSummary[];
        setGsFiles(data);
      } catch (err) {
        console.error("Failed to load GS files:", err)
        toast.error(getApiErrorMessage(err, 'Failed to load ground station files'), { id: 'main-config-gs-files' })
      }
    };
    fetchGSFiles();
  }, []); // only fetch files once
  
  useEffect(() => {
    const loadStations = async () => {
      if (config.gs_file_id == null) return;
  
      try {
        const data = await apiFetch(
          config.gs_file_id === -1
            ? "/ground_station_file/default"
            : `/ground_station_file/${config.gs_file_id}`
        ) as { stations: StationOption[] };
        setStations(data.stations || []);
  
        // Update default nodes if none selected
        if (config.SourceNode == null) updateField("SourceNode", 0);
        if (config.DestNode == null) updateField("DestNode", 1);
  
      } catch (err) {
        console.error("Failed to load stations:", err)
        toast.error(getApiErrorMessage(err, 'Failed to load stations'), { id: 'main-config-stations' })
      }
    };

    loadStations();
  }, [config.gs_file_id]); // runs whenever GS file changes

  const updateGSNodes = async (value: number) => {
    if (!value) return; // Don't fetch until GS file is chosen
  
    try {
      if (value === -1) {
        const data = await apiFetch(`/ground_station_file/default`) as { stations: StationOption[] };
        setStations(data.stations || []);
      }
      else {
        const data = await apiFetch(`/ground_station_file/${value}`) as { stations: StationOption[] };
        setStations(data.stations || []);
      }
        
    } catch (err) {
      console.error("Failed to load stations:", err)
      toast.error(getApiErrorMessage(err, 'Failed to load stations'), { id: 'main-config-stations' })
    }
  };

  const updateField = <K extends keyof MainConfig>(field: K, value: MainConfig[K]) => {
    onChange({ ...config, [field]: value })
  }

  const handleIstnToggle = (enabled: boolean) => {
    setIstnEnabled(enabled)
    if (enabled) {
      updateField('TopoCrit', 2) // Default to "Both"
      // Initialize Azure and WonderProxy if they don't exist
      if (!config.Azure) {
        updateField('Azure', { t2t_use_azure: false })
      }
      if (!config.WonderProxy) {
        updateField('WonderProxy', { t2t_use_wonderproxy: false })
      }
    } else {
      updateField('TopoCrit', 0) // ISL only
      setAzureChecked(false)
      setWonderProxyChecked(false)
      setIstnError('')
    }
  }

  const handleAzureToggle = (checked: boolean) => {
    setAzureChecked(checked)
    if (checked) {
      updateField('Azure', {
        t2t_use_azure: true,
        t2t_azure_endpoint_location_file: config.Azure?.t2t_azure_endpoint_location_file || '',
        t2t_azure_endpoint_latency_url: config.Azure?.t2t_azure_endpoint_latency_url || '',
        t2t_azure_dict_output_file: config.Azure?.t2t_azure_dict_output_file || '',
      })
      setIstnError('')
    } else {
      if (!wonderProxyChecked && istnEnabled) {
        setIstnError('At least one integration provider must be selected when ISTN is enabled')
      }
      updateField('Azure', { ...config.Azure, t2t_use_azure: false })
    }
  }

  const handleWonderProxyToggle = (checked: boolean) => {
    setWonderProxyChecked(checked)
    if (checked) {
      updateField('WonderProxy', {
        t2t_use_wonderproxy: true,
        t2t_wonderproxy_endpoint_location_file: config.WonderProxy?.t2t_wonderproxy_endpoint_location_file || '',
        t2t_wonderproxy_endpoint_latency_file: config.WonderProxy?.t2t_wonderproxy_endpoint_latency_file || '',
        t2t_wonderproxy_dict_output_file: config.WonderProxy?.t2t_wonderproxy_dict_output_file || '',
      })
      setIstnError('')
    } else {
      if (!azureChecked && istnEnabled) {
        setIstnError('At least one integration provider must be selected when ISTN is enabled')
      }
      updateField('WonderProxy', { ...config.WonderProxy, t2t_use_wonderproxy: false })
    }
  }

  const updateAzureField = <K extends keyof NonNullable<MainConfig['Azure']>>(field: K, value: NonNullable<MainConfig['Azure']>[K]) => {
    updateField('Azure', { ...config.Azure!, [field]: value })
  }

  const updateWonderProxyField = <K extends keyof NonNullable<MainConfig['WonderProxy']>>(field: K, value: NonNullable<MainConfig['WonderProxy']>[K]) => {
    updateField('WonderProxy', { ...config.WonderProxy!, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Simulation & Output */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Simulation & Output
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Debug
            </label>
            <select
              value={config.Debug}
              onChange={(e) => updateField('Debug', parseInt(e.target.value) as 0 | 1)}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
            >
              <option value="0">0 (Disabled)</option>
              <option value="1">1 (Enabled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resource Monitoring */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
              Resource Monitoring
            </h3>
            <p className="text-xs text-light-text/60 dark:text-dark-subtext">
              Enable resource monitoring during simulation
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.MonitorResource}
              onChange={(e) => updateField('MonitorResource', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-maroon/20 dark:peer-focus:ring-maroon/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-maroon"></div>
          </label>
        </div>
      </div>

      {/* Routing Nodes */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Source & Destination Nodes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Source Node <span className="text-red-500">*</span>
            </label>
            <select
              value={config.SourceNode}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateField("SourceNode", val);
              }}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
            >
              {stations.map((st) => (
                <option
                  key={st.id}
                  value={st.id}
                  disabled={st.id === config.DestNode}   // <-- disable selected dest
                >
                  {st.id} - {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Destination Node <span className="text-red-500">*</span>
            </label>
            <select
              value={config.DestNode}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateField("DestNode", val);
              }}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
            >
              {stations.map((st) => (
                <option
                  key={st.id}
                  value={st.id}
                  disabled={st.id === config.SourceNode}  // <-- disable selected source
                >
                  {st.id} - {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Routing Algorithm */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Routing Algorithm
        </h3>
        <div>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
            Route Weight <span className="text-red-500">*</span>
          </label>
          <select
            value={config.RouteWeight}
            onChange={(e) => updateField('RouteWeight', e.target.value as MainConfig['RouteWeight'])}
            className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
          >
            <option value="hops">hops</option>
            <option value="latency">latency</option>
            <option value="distance">distance</option>
            <option value="capacity">capacity</option>
          </select>
          <p className="text-xs text-light-text/60 dark:text-dark-subtext mt-1">
            Floyd–Warshall weighting metric.
          </p>
        </div>
      </div>

      {/* Ground Station Options */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Ground Station Options
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Ground Station File
            </label>

            <select
              value={config.gs_file_id}
              onChange={(e) => {updateField("gs_file_id", parseInt(e.target.value) || 0); updateGSNodes(parseInt(e.target.value))}}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50 text-sm"
            >
              <option value={-1}>default</option>
              {gsFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Minimum Elevation Angle (degrees)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              step="0.1"
              value={config.min_elevation_angle}
              onChange={(e) => updateField('min_elevation_angle', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
              aria-invalid={config.min_elevation_angle < 0 || config.min_elevation_angle > 90}
            />
            <p className="text-xs text-light-text/60 dark:text-dark-subtext mt-1">0–90 degrees</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Association Criteria GSL
            </label>
            <select
              value={config.AssociationCritGSL}
              onChange={(e) => updateField('AssociationCritGSL', e.target.value)}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
            >
              <option value="BASED_ON_DISTANCE_ONLY_MININET">BASED_ON_DISTANCE_ONLY_MININET</option>
              <option value="BASED_ON_DISTANCE_ONLY_MININET_ALAN">BASED_ON_DISTANCE_ONLY_MININET_ALAN</option>
              <option value="BASED_ON_LONGEST_ASSOCIATION_TIME">BASED_ON_LONGEST_ASSOCIATION_TIME</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                Use Weather Data
              </label>
              <p className="text-xs text-light-text/60 dark:text-dark-subtext">
                Include weather data in simulation
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.UseWeatherData}
                onChange={(e) => updateField('UseWeatherData', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-maroon/20 dark:peer-focus:ring-maroon/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-maroon"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Terrestrial Integration Configuration */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
            Terrestrial Integration (ISTN)
          </h3>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm font-medium text-light-text dark:text-dark-text">
              ISTN Enabled
            </label>
            <p className="text-xs text-light-text/60 dark:text-dark-subtext mt-1">
              When enabled, routes traffic through terrestrial providers (Azure, WonderProxy) alongside satellite inter-satellite links.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={istnEnabled}
              onChange={(e) => handleIstnToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-maroon/20 dark:peer-focus:ring-maroon/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-maroon"></div>
          </label>
        </div>

        {istnEnabled && (
          <div className="space-y-4 pt-4 border-t border-light-border dark:border-dark-border">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-3">
                Integration Providers (select at least one)
              </label>
              {istnError && (
                <p className="text-xs text-red-500 mt-2">{istnError}</p>
              )}
            </div>

            {/* Azure subsection */}
            {config.Azure && (
              <div className="p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-light-text dark:text-dark-text">Azure</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.Azure.t2t_use_azure}
                      onChange={(e) => updateAzureField('t2t_use_azure', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-maroon/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-maroon"></div>
                  </label>
                </div>
              </div>
            )}

            {/* WonderProxy subsection */}
            {config.WonderProxy && (
              <div className="p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-light-text dark:text-dark-text">WonderProxy</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.WonderProxy.t2t_use_wonderproxy}
                      onChange={(e) => updateWonderProxyField('t2t_use_wonderproxy', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-maroon/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-maroon"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

