'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, RadioTower } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'

interface Station {
  id: number
  name: string
  lat: number
  lon: number
}

interface StationSet {
  id: number
  name: string
  stations: Station[]
}

function latError(lat: number): string | undefined {
  if (Number.isNaN(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90'
  return undefined
}

function lonError(lon: number): string | undefined {
  if (Number.isNaN(lon) || lon < -180 || lon > 180) return 'Longitude must be between -180 and 180'
  return undefined
}

export default function EditStationSetPage() {
  const params = useParams()
  const id = params.id as string

  const [setData, setSetData] = useState<StationSet | null>(null)
  const [original, setOriginal] = useState<StationSet | null>(null)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // ----------------------------
  // Load set
  // ----------------------------
  const loadSet = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await apiFetch(`/ground_station_file/${id}`) as StationSet
      setSetData(data)
      setOriginal(data)
    } catch (err) {
      // Expected 4xx responses (e.g. 404 for a set that doesn't exist)
      // are surfaced to the user via the ErrorState below — no need to
      // pollute the console. Only log unexpected failures.
      if (!(err instanceof ApiError) || err.status >= 500) {
        console.error(err)
      }
      setLoadError(getApiErrorMessage(err, 'Failed to load station set'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadSet()
  }, [loadSet])

  useEffect(() => {
    if (!setData) return;

    // validate set name
    const nameOk = setData.name.trim().length > 0;

    // validate stations
    const stationsOk = setData.stations.every(s => {
      const nameGood = s.name.trim().length > 0;
      const latGood = typeof s.lat === "number" && !latError(s.lat);
      const lonGood = typeof s.lon === "number" && !lonError(s.lon);
      return nameGood && latGood && lonGood;
    });

    setIsValid(nameOk && stationsOk);
  }, [setData]);

  const updateSetField = (field: keyof StationSet, value: unknown) => {
    setSetData(prev => prev ? { ...prev, [field]: value } : prev)
    setHasUnsaved(true)
  }

  const updateStation = (sid: number, field: keyof Station, value: unknown) => {
    setSetData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        stations: prev.stations.map(s =>
          s.id === sid ? { ...s, [field]: value } : s
        )
      }
    })
    setHasUnsaved(true)
  }

  const addStation = () => {
    const newStation: Station = {
      id: Date.now(), // temporary frontend-generated id
      name: '',
      lat: 0,
      lon: 0
    }
    setSetData(prev =>
      prev ? { ...prev, stations: [...prev.stations, newStation] } : prev
    )
    setHasUnsaved(true)
  }

  const removeStation = (sid: number) => {
    setSetData(prev =>
      prev
        ? { ...prev, stations: prev.stations.filter(s => s.id !== sid) }
        : prev
    )
    setHasUnsaved(true)
  }

  const restore = () => {
    if (original) {
      setSetData(structuredClone(original))
      setHasUnsaved(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch(`/ground_station_file/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setData?.stations)
      })

      toast.success("Saved")
      setOriginal(structuredClone(setData))
      setHasUnsaved(false)

    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save station set'), { id: 'gs-set-save' })
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-6">
        <SkeletonStatus>Loading station set…</SkeletonStatus>
        <div className="space-y-3">
          <Skeleton className="h-9 w-24 rounded-btn" />
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-16 w-full rounded-card" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-card" />
        ))}
      </div>
    )
  }

  if (loadError || !setData) {
    return (
      <div className="p-6 sm:p-8 min-h-screen flex items-center justify-center">
        <ErrorState
          title="Failed to load station set"
          message={loadError ?? undefined}
          onRetry={() => void loadSet()}
        />
      </div>
    )
  }

  return (
    <div className={`px-6 pt-6 sm:px-8 sm:pt-8 ${hasUnsaved ? 'pb-24' : 'pb-6 sm:pb-8'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/ground-stations">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
            Ground Station Set: {setData.name}
          </h1>
          <p className="text-sm text-light-text/60 dark:text-dark-subtext">Contains {setData.stations.length} stations</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={restore} disabled={saving} aria-label="Restore unsaved changes">Restore</Button>
          <Button variant="primary" onClick={save} disabled={!isValid || saving} aria-label="Save station set">
            <Save className="h-4 w-4 mr-2" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Set name */}
      <div className="mt-6 mb-4">
        <Input
          type="text"
          label="Name"
          value={setData.name}
          onChange={e => updateSetField('name', e.target.value)}
          error={!setData.name.trim() ? 'Name is required' : undefined}
        />
      </div>

      {/* Stations list */}
      <div className="space-y-4 mt-6">
        {setData.stations.length === 0 && (
          <EmptyState
            icon={RadioTower}
            title="No stations in this set"
            description="Add a station to define a ground location for GSL generation."
            action={
              <Button variant="primary" onClick={addStation}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Add Station
              </Button>
            }
          />
        )}
        {setData.stations.map(station => (
          <motion.div
            key={station.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-light-text dark:text-dark-text">{station.name || "Unnamed Station"}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStation(station.id)}
                  aria-label={`Remove station ${station.name || 'unnamed'}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  type="text"
                  label="Name"
                  value={station.name}
                  onChange={e => updateStation(station.id, "name", e.target.value)}
                  error={!station.name.trim() ? 'Name is required' : undefined}
                />
                <Input
                  type="number"
                  label="Latitude"
                  value={station.lat}
                  onChange={e => updateStation(station.id, "lat", parseFloat(e.target.value))}
                  error={latError(station.lat)}
                  helperText="-90 to 90"
                />
                <Input
                  type="number"
                  label="Longitude"
                  value={station.lon}
                  onChange={e => updateStation(station.id, "lon", parseFloat(e.target.value))}
                  error={lonError(station.lon)}
                  helperText="-180 to 180"
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add station button */}
      {setData.stations.length > 0 && (
        <div className="mt-6">
          <Button variant="primary" onClick={addStation}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Station
          </Button>
        </div>
      )}

      {/* Unsaved footer */}
      {hasUnsaved && (
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface z-40">
          <div className="max-w-[1920px] mx-auto flex justify-between items-center">
            <span className="text-sm text-light-text/60 dark:text-dark-subtext">Unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={restore} disabled={saving}>Restore</Button>
              <Button variant="primary" onClick={save} disabled={!isValid || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
