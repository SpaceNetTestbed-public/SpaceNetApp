'use client'

import { ShellConfig, defaultSatConfig } from '@/types/experiment-config'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { Button } from '../ui/button'
import { useState } from 'react'
import {
  ALTITUDE_MIN_KM,
  ALTITUDE_MAX_KM,
  INCLINATION_MIN_DEG,
  INCLINATION_MAX_DEG,
  MIN_ORBITS,
  MAX_ORBITS,
  MIN_SATS_PER_ORBIT,
  MAX_SATS_PER_ORBIT,
  IPP_INCREMENT_MIN,
} from '@/lib/constants'

// Known defaults for a fresh experiment; on new/unedited forms these render
// as an empty input with a placeholder instead of a pre-filled number.
const DEFAULT_ORBITS = defaultSatConfig.shells[0].orbits
const DEFAULT_SATS_PER_ORBIT = defaultSatConfig.shells[0].sat_per_orbit

interface ShellEditorProps {
  shell: ShellConfig
  index: number
  onChange: (index: number, shell: ShellConfig) => void
  onRemove: (index: number) => void
  canRemove: boolean
  // True when landing from a fresh create (?new=true on the edit page) —
  // saved experiments opened later always render their stored values, even
  // when those happen to equal the defaults.
  isNew?: boolean
}

export function ShellEditor({ shell, index, onChange, onRemove, canRemove, isNew = false }: ShellEditorProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0)
  const [orbitsTouched, setOrbitsTouched] = useState(false)
  const [satsPerOrbitTouched, setSatsPerOrbitTouched] = useState(false)

  const showOrbitsPlaceholder =
    isNew && !orbitsTouched && shell.orbits === DEFAULT_ORBITS
  const showSatsPlaceholder =
    isNew && !satsPerOrbitTouched && shell.sat_per_orbit === DEFAULT_SATS_PER_ORBIT

  const updateField = <K extends keyof ShellConfig>(field: K, value: ShellConfig[K]) => {
    onChange(index, { ...shell, [field]: value })
  }

  // Derive a safe default without mutating the prop.
  const perturber: ShellConfig['perturber'] = shell.perturber ?? 'None'

  return (
    <div className="border border-light-border dark:border-dark-border rounded-card bg-light-surface dark:bg-dark-surface">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-light-text dark:text-dark-text hover:text-vt-maroon dark:hover:text-vt-maroon transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            <span className="font-semibold">{shell.name}</span>
          </button>
        </div>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-600" aria-label={`Remove shell ${shell.name}`}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Orbits <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={MIN_ORBITS}
              max={MAX_ORBITS}
              value={showOrbitsPlaceholder ? '' : shell.orbits}
              placeholder={`e.g. ${DEFAULT_ORBITS}`}
              onChange={(e) => {
                setOrbitsTouched(true)
                updateField('orbits', parseInt(e.target.value) || 1)
              }}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Satellites per Orbit <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={MIN_SATS_PER_ORBIT}
              max={MAX_SATS_PER_ORBIT}
              value={showSatsPlaceholder ? '' : shell.sat_per_orbit}
              placeholder={`e.g. ${DEFAULT_SATS_PER_ORBIT}`}
              onChange={(e) => {
                setSatsPerOrbitTouched(true)
                updateField('sat_per_orbit', parseInt(e.target.value) || 1)
              }}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Altitude (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={ALTITUDE_MIN_KM}
              max={ALTITUDE_MAX_KM}
              step="1"
              value={shell.altitude}
              onChange={(e) => updateField('altitude', parseFloat(e.target.value) || 200)}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              aria-invalid={shell.altitude < ALTITUDE_MIN_KM || shell.altitude > ALTITUDE_MAX_KM}
            />
            <p className="text-xs text-light-text/60 dark:text-dark-subtext mt-1">
              {ALTITUDE_MIN_KM}–{ALTITUDE_MAX_KM} km (LEO typical)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Inclination (degrees) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={INCLINATION_MIN_DEG}
              max={INCLINATION_MAX_DEG}
              step="0.1"
              value={shell.inclination}
              onChange={(e) => updateField('inclination', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
              aria-invalid={shell.inclination < INCLINATION_MIN_DEG || shell.inclination > INCLINATION_MAX_DEG}
            />
            <p className="text-xs text-light-text/60 dark:text-dark-subtext mt-1">
              {INCLINATION_MIN_DEG}–{INCLINATION_MAX_DEG} degrees
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Pattern <span className="text-red-500">*</span>
            </label>
            <select
              value={shell.pattern}
              onChange={(e) => updateField('pattern', e.target.value as ShellConfig['pattern'])}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            >
              <option value="walker_delta">walker_delta</option>
              <option value="walker_star">walker_star</option>
              <option value="ELFD">ELFD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              IPP Increment
            </label>
            <input
              type="number"
              min={IPP_INCREMENT_MIN}
              max={360}
              value={shell.ipp_increment}
              onChange={(e) => updateField('ipp_increment', parseInt(e.target.value) || IPP_INCREMENT_MIN)}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Body <span className="text-red-500">*</span>
            </label>
            <select
              value={shell.body}
              onChange={(e) => updateField('body', e.target.value as ShellConfig['body'])}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            >
              <option value="Earth">Earth</option>
              <option value="Moon">Moon</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
              Perturber <span className="text-red-500">*</span>
            </label>
            <select
              value={perturber}
              onChange={(e) => updateField('perturber', e.target.value as ShellConfig['perturber'])}
              className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
            >
              <option value="Earth">Earth</option>
              <option value="Moon">Moon</option>
              <option value="None">None</option>
            </select>
            {perturber !== 'None' && shell.body === perturber && (
              <p className="text-xs text-red-500 mt-1">Body and Perturber cannot be the same</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

