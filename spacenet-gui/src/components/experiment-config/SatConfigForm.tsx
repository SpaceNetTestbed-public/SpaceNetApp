'use client'

import { SatConfig, ShellConfig } from '@/types/experiment-config'
import { ShellEditor } from './ShellEditor'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  SIM_TIME_STEP_DURATION_MIN,
  SIM_TIME_STEP_DURATION_MAX,
  SIM_TIME_STEP_COUNT_MIN,
  SIM_TIME_STEP_COUNT_MAX,
} from '@/lib/constants'
import type { TLEFile } from '@/types/types'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'

interface SatConfigFormProps {
  config: SatConfig
  onChange: (config: SatConfig) => void
  tleLocked?: boolean
}

export function SatConfigForm({ config, onChange, tleLocked = false }: SatConfigFormProps) {
  const [tleFiles, setTLEFiles] = useState<TLEFile[]>([]);
  const updateField = <K extends keyof SatConfig>(field: K, value: SatConfig[K]) => {
    onChange({ ...config, [field]: value })
  }

  const updateSimLength = (field: keyof SatConfig['Sim_Length'], value: number) => {
    onChange({
      ...config,
      Sim_Length: { ...config.Sim_Length, [field]: value },
    })
  }

  const updateSimDateTime = (field: keyof SatConfig['Sim_Date_Time'], value: number) => {
    onChange({
      ...config,
      Sim_Date_Time: { ...config.Sim_Date_Time, [field]: value },
    })
  }

  useEffect(() => {
      const fetchTLEFiles = async () => {
        try {
          const data = await apiFetch("/tles") as TLEFile[];
          setTLEFiles(data);
        } catch (err) {
          console.error("Failed to load GS files:", err)
          toast.error(getApiErrorMessage(err, 'Failed to load TLE files'), { id: 'sat-config-tles-files' })
        }
      };
      fetchTLEFiles();
    }, []); // only fetch files once

  // Normalize: API may return Record; type is ShellConfig[]
  const shellsArray: ShellConfig[] = Array.isArray(config.shells)
    ? config.shells
    : Object.values(config.shells ?? {})

  const updateShell = (index: number, shell: ShellConfig) => {
    const newShells = shellsArray.slice()
    newShells[index] = shell
    onChange({ ...config, shells: newShells })
  }

  const addShell = () => {
    const newShell: ShellConfig = {
      name: `shell${shellsArray.length + 1}`,
      orbits: 72,
      sat_per_orbit: 22,
      altitude: 550,
      inclination: 53,
      pattern: 'walker_delta',
      ipp_increment: 1,
      body: 'Earth',
      perturber: 'Moon',
    }
    onChange({ ...config, shells: [...shellsArray, newShell] })
  }

  const removeShell = (index: number) => {
    if (shellsArray.length <= 1) return
    const newShells = shellsArray
      .filter((_, i) => i !== index)
      .map((shell, i) => ({ ...shell, name: `shell${i + 1}` }))
    onChange({ ...config, shells: newShells })
  }
  
  

  const totalDuration = config.Sim_Length.TimeStepDuration * config.Sim_Length.TimeStepCount
  const totalMinutes = Math.floor(totalDuration / 60)

  // Date/time helpers
  const currentDate = new Date(
    config.Sim_Date_Time.StartYear,
    config.Sim_Date_Time.StartMonth - 1,
    config.Sim_Date_Time.StartDay
  )
  const dateString = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Operator Name */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Operator
        </h3>
        <div>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
            Operator Name <span className="text-red-500">*</span>
          </label>
          <select
            value={config.operator_name}
            onChange={(e) => updateField('operator_name', e.target.value as SatConfig['operator_name'])}
            className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
          >
            <option value="starlink">Starlink</option>
            <option value="lunar">Lunar (beta testing)</option>
          </select>
        </div>
      </div>

      {/* Simulation Timing */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Simulation Timing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Time Step Duration (seconds) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={SIM_TIME_STEP_DURATION_MIN}
              max={SIM_TIME_STEP_DURATION_MAX}
              value={config.Sim_Length.TimeStepDuration}
              onChange={(e) =>
                updateSimLength('TimeStepDuration', parseInt(e.target.value) || SIM_TIME_STEP_DURATION_MIN)
              }
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              aria-describedby="sim-duration-hint"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Time Step Count <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={SIM_TIME_STEP_COUNT_MIN}
              max={SIM_TIME_STEP_COUNT_MAX}
              value={config.Sim_Length.TimeStepCount}
              onChange={(e) =>
                updateSimLength('TimeStepCount', parseInt(e.target.value) || SIM_TIME_STEP_COUNT_MIN)
              }
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              aria-describedby="sim-duration-hint"
            />
          </div>
        </div>
        <p id="sim-duration-hint" className="text-xs text-light-text/60 dark:text-dark-subtext mt-2">
          Duration {SIM_TIME_STEP_DURATION_MIN}–{SIM_TIME_STEP_DURATION_MAX} s; count{' '}
          {SIM_TIME_STEP_COUNT_MIN}–{SIM_TIME_STEP_COUNT_MAX.toLocaleString()}. Total: {totalMinutes} minutes
        </p>
      </div>

      {/* Simulation Start Epoch */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          Simulation Start Epoch
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={`${String(config.Sim_Date_Time.StartYear).padStart(4, '0')}-${String(config.Sim_Date_Time.StartMonth).padStart(2, '0')}-${String(config.Sim_Date_Time.StartDay).padStart(2, '0')}`}
              onChange={(e) => {
                // Parse the YYYY-MM-DD string directly (new Date() would parse it
                // as UTC and shift the day in negative-offset timezones) and commit
                // year/month/day in ONE update — three sequential updateSimDateTime
                // calls each spread the stale config, so only the last field stuck.
                const [year, month, day] = e.target.value.split('-').map(Number)
                if (year && month && day) {
                  onChange({
                    ...config,
                    Sim_Date_Time: {
                      ...config.Sim_Date_Time,
                      StartYear: year,
                      StartMonth: month,
                      StartDay: day,
                    },
                  })
                }
              }}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Start Time
            </label>
            <div className="flex gap-2">
              {/* Hours (0–23) */}
              <input
                type="number"
                min="0"
                max="23"
                value={config.Sim_Date_Time.StartHour}
                onChange={(e) =>
                  updateSimDateTime('StartHour', Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))
                }
                className="flex-1 px-3 py-2 rounded-btn border border-light-border dark:border-dark-border
                          bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text
                          focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              />

              {/* Minutes (0–59) */}
              <input
                type="number"
                min="0"
                max="59"
                value={config.Sim_Date_Time.StartMinute}
                onChange={(e) =>
                  updateSimDateTime('StartMinute', Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                }
                className="flex-1 px-3 py-2 rounded-btn border border-light-border dark:border-dark-border
                          bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text
                          focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              />

              {/* Seconds (0–59) */}
              <input
                type="number"
                min="0"
                max="59"
                value={config.Sim_Date_Time.StartSecond}
                onChange={(e) =>
                  updateSimDateTime('StartSecond', Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                }
                className="flex-1 px-3 py-2 rounded-btn border border-light-border dark:border-dark-border
                          bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text
                          focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              />
            </div>

          </div>
        </div>
      </div>

      {/* TLE File Options */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
          TLE File Options
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
                Generate Custom TLEs
              </label>
              <p className="text-xs text-light-text/60 dark:text-dark-subtext">
                {config.tle_id !== -1
                  ? 'Unavailable while a custom TLE file is selected — Phase 1 uses the uploaded file.'
                  : tleLocked
                    ? 'Locked because this experiment has already been run.'
                    : 'Generate synthetic TLEs from the shell configuration below instead of loading a TLE file.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.generate_TLE === true}
                disabled={tleLocked || config.tle_id !== -1}
                onChange={(e) => updateField('generate_TLE', e.target.checked)}
                className="sr-only peer"
                aria-label="Generate custom TLEs"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-vt-maroon/20 dark:peer-focus:ring-vt-maroon/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-vt-maroon peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              TLE File
            </label>

            <select
              value={config.tle_id}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                // A selected custom TLE file and TLE generation are mutually
                // exclusive Phase 1 inputs — force generation off with the
                // file selection in a single update.
                onChange({
                  ...config,
                  tle_id: val,
                  ...(val !== -1 ? { generate_TLE: false } : {}),
                })
              }}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50 text-sm"
            >
              <option value={-1}>No Custom</option>
              {tleFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          {config.generate_TLE === false && config.tle_id === -1 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 font-medium" role="status">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              You must either enable TLE generation or select a specific TLE file —
              Phase 1 cannot run with neither.
            </p>
          )}
          {config.generate_TLE === false && config.tle_id !== -1 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 font-medium" role="status">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              TLE generation is disabled for this experiment — Phase 1 will load a real
              TLE file instead of generating orbits from the shells below. If the TLE
              file&apos;s satellite count doesn&apos;t match the shell configuration, the run
              will fail.
            </p>
          )}
        </div>
      </div>

      {/* Shells */}
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
            Shells
          </h3>
          <p className="text-sm text-light-text/60 dark:text-dark-subtext">
            Shell parameters used to generate or interpret constellation TLEs.
          </p>
        </div>
        <div className="space-y-4">
          {shellsArray.map((shell, index) => (
            <ShellEditor
              key={index}
              shell={shell}
              index={index}
              onChange={updateShell}
              onRemove={removeShell}
              canRemove={index != 0}
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={addShell}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shell
          </Button>
        </div>
      </div>
    </div>
  )
}

