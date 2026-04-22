'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

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

export default function EditStationSetPage() {
  const params = useParams()
  const id = params.id as string

  const [setData, setSetData] = useState<StationSet | null>(null)
  const [original, setOriginal] = useState<StationSet | null>(null)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)

  // ----------------------------
  // Load set
  // ----------------------------
  useEffect(() => {
    const loadSet = async () => {
      try {
        const data = await apiFetch(`/ground_station_file/${id}`) as StationSet
        setSetData(data)
        setOriginal(data)
      } catch (err) {
        toast.error("Failed to load station set")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadSet()
  }, [id])

  useEffect(() => {
    if (!setData) return;
  
    // validate set name
    const nameOk = setData.name.trim().length > 0;
  
    // validate stations
    const stationsOk = setData.stations.every(s => {
      const nameGood = s.name.trim().length > 0;
      const latGood = typeof s.lat === "number" && s.lat >= -90 && s.lat <= 90;
      const lonGood = typeof s.lon === "number" && s.lon >= -180 && s.lon <= 180;
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
      toast.error("Failed to save")
      console.error(err)
    }
  }

  if (loading || !setData) {
    return <div className="p-10">Loading...</div>
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/ground-stations">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>

          <h1 className="text-3xl font-bold">
            Ground Station Set: {setData.name}
          </h1>
          <p className="text-sm opacity-60">Contains {setData.stations.length} stations</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={restore}>Restore</Button>
          <Button onClick={save} disabled={!isValid}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Set name */}
      <div className="mt-6 mb-4">
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          value={setData.name}
          onChange={e => updateSetField('name', e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded border"
        />
      </div>

      {/* Stations list */}
      <div className="space-y-4 mt-6">
        {setData.stations.map(station => (
          <motion.div
            key={station.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border p-4 rounded-card bg-light-surface dark:bg-dark-surface"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{station.name || "Unnamed Station"}</h3>
              <Button variant="ghost" size="sm" onClick={() => removeStation(station.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={station.name}
                  onChange={e => updateStation(station.id, "name", e.target.value)}
                  className="w-full mt-1 px-2 py-1 rounded border"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Latitude</label>
                <input
                  type="number"
                  value={station.lat}
                  onChange={e => updateStation(station.id, "lat", parseFloat(e.target.value))}
                  className="w-full mt-1 px-2 py-1 rounded border"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Longitude</label>
                <input
                  type="number"
                  value={station.lon}
                  onChange={e => updateStation(station.id, "lon", parseFloat(e.target.value))}
                  className="w-full mt-1 px-2 py-1 rounded border"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add station button */}
      <div className="mt-6">
        <Button onClick={addStation}>
          <Plus className="h-4 w-4 mr-2" />
          Add Station
        </Button>
      </div>

      {/* Unsaved footer */}
      {hasUnsaved && (
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-light-surface dark:bg-dark-surface">
          <div className="max-w-[1920px] mx-auto flex justify-between items-center">
            <span className="text-sm opacity-60">Unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={restore}>Restore</Button>
              <Button onClick={save} disabled={!isValid}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
