'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Plus, Trash, Search, Edit } from 'lucide-react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface GroundStationFile {
  id: number
  name: string
  station_count: number
}

function GSTableSkeleton() {
  return (
    <>
      <tr role="status" aria-live="polite">
        <td colSpan={3} className="sr-only">Loading ground station files…</td>
      </tr>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 bg-light-border dark:bg-dark-border rounded w-40" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-light-border dark:bg-dark-border rounded w-12" /></td>
          <td className="px-6 py-4">
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-light-border dark:bg-dark-border rounded" />
              <div className="h-8 w-8 bg-light-border dark:bg-dark-border rounded" />
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

export default function GroundStationsPage() {
  const router = useRouter()
  const [gsFiles, setGsFiles] = useState<GroundStationFile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showGSModal, setShowGSModal] = useState(false);
  const [newGSName, setNewGSName] = useState("");
  const [creatingGS, setCreatingGS] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<GroundStationFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  // Fetch ground station files
  useEffect(() => {
    const loadGSFiles = async () => {
      setLoading(true)
      try {
        const data = await apiFetch('/ground_station_file') as GroundStationFile[]
        setGsFiles(data)
      } catch (err) {
        console.error(err)
        toast.error(getApiErrorMessage(err, 'Failed to load ground station files'), { id: 'gs-files-load' })
      } finally {
        setLoading(false)
      }
    }
    loadGSFiles()
  }, [])

  // Delete a ground station file
  const deleteGSFile = async (file: GroundStationFile) => {
    setIsDeleting(true)
    try {
      await apiFetch(`/ground_station_file/${file.id}`, { method: 'DELETE' })
      toast.success(`Deleted "${file.name}"`)
      setGsFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to delete ground station file'), { id: 'gs-file-delete' })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  // Filtered list based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return gsFiles
    return gsFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [gsFiles, searchQuery])

  return (
    <div className="min-h-screen p-6 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Ground Station Files
        </h1>
        <p className="text-sm text-light-text/60 dark:text-dark-subtext">
          List of all ground station files with counts
        </p>
      </motion.div>

      {/* Search + New */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="sm:mr-auto relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext" />
          <input
            type="text"
            placeholder="Search ground station files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text"
          />
        </div>
        <Button
            className="bg-maroon hover:bg-maroon-hover text-white"
            onClick={() => setShowGSModal(true)}
            >
            <Plus className="h-4 w-4 mr-2" /> New File
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">
                  Station Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {loading ? (
                <GSTableSkeleton />
              ) : filteredFiles.map((file, i) => (
                <motion.tr
                  key={file.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">{file.name}</td>
                  <td className="px-6 py-4 text-sm">{file.station_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/ground-stations/${file.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2" aria-label={`Edit ${file.name}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteConfirm(file)}
                        title="Delete File"
                        aria-label={`Delete ${file.name}`}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredFiles.length === 0 && (
          <div role="status" aria-live="polite" className="text-center py-12 text-light-text/60 dark:text-dark-subtext">
            No ground station files found.
          </div>
        )}
      </motion.div>
      {showGSModal && (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 
                    bg-black/50 backdrop-blur-sm"
            onClick={() => setShowGSModal(false)}
        >
            <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="
                w-full max-w-md rounded-card shadow-xl p-6
                bg-light-surface dark:bg-dark-surface
                border border-light-border dark:border-dark-border
            "
            >
            {/* Title */}
            <h2 className="text-2xl font-semibold mb-4 text-light-text dark:text-dark-text">
                Create Ground Station File
            </h2>

            {/* Fields */}
            <div className="space-y-4">
                {/* Name */}
                <div>
                <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                    Name <span className="text-red-500">*</span>
                </label>

                <input
                    type="text"
                    value={newGSName}
                    onChange={(e) => setNewGSName(e.target.value)}
                    className="
                    w-full px-3 py-2 rounded-btn font-mono text-sm
                    border border-light-border dark:border-dark-border
                    bg-light-bg dark:bg-dark-bg
                    text-light-text dark:text-dark-text
                    focus:outline-none focus:ring-2 focus:ring-maroon/50
                    "
                    placeholder="e.g., my_ground_stations"
                />
                </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
                <Button
                variant="outline"
                onClick={() => setShowGSModal(false)}
                className="
                    border-light-border dark:border-dark-border
                    text-light-text dark:text-dark-text
                "
                >
                Cancel
                </Button>

                <Button
                className="bg-maroon hover:bg-maroon-hover text-white"
                disabled={creatingGS || !newGSName.trim()}
                onClick={async () => {
                    setCreatingGS(true);
                    try {
                      const data = await apiFetch("/ground_station_file", {
                          method: "POST",
                          body: JSON.stringify({ name: newGSName.trim() }),
                      }) as { gs_file_id: string };
                      setShowGSModal(false);
                      setNewGSName("");
                      router.push(`/ground-stations/${data.gs_file_id}`)
                    } catch (err) {
                      console.error(err);
                      toast.error(getApiErrorMessage(err, 'Failed to create ground station file'), { id: 'gs-file-create' })
                    } finally {
                      setCreatingGS(false);
                    }
                }}
                >
                {creatingGS ? "Creating..." : "Create"}
                </Button>
            </div>
            </motion.div>
        </div>
        )}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Ground Station File"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting..."
        cancelLabel="Cancel"
        variant="danger"
        isConfirming={isDeleting}
        onConfirm={() => deleteConfirm && deleteGSFile(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
