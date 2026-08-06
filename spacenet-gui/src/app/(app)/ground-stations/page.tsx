'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Plus, Trash, Search, Edit, RadioTower } from 'lucide-react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

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
        <tr key={i}>
          <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
          <td className="px-6 py-4">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
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


  const [loadError, setLoadError] = useState<string | null>(null)

  // Fetch ground station files
  const loadGSFiles = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await apiFetch('/ground_station_file') as GroundStationFile[]
      setGsFiles(data)
    } catch (err) {
      console.error(err)
      setLoadError(getApiErrorMessage(err, 'Failed to load ground station files'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGSFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search ground station files..."
            aria-label="Search ground station files"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text placeholder:text-light-text/40 dark:placeholder:text-dark-subtext focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
          />
        </div>
        <Button
            variant="primary"
            onClick={() => setShowGSModal(true)}
            >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> New File
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

        {!loading && loadError && (
          <ErrorState
            title="Failed to load ground station files"
            message={loadError}
            onRetry={() => void loadGSFiles()}
          />
        )}

        {!loading && !loadError && filteredFiles.length === 0 && (
          gsFiles.length === 0 ? (
            <EmptyState
              icon={RadioTower}
              title="No ground station files yet"
              description="Create a file to define the ground stations your experiments can link to."
              action={
                <Button variant="primary" onClick={() => setShowGSModal(true)}>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> New File
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No files match your search"
              description="Try a different search term."
              action={
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              }
            />
          )
        )}
      </motion.div>
      <Dialog open={showGSModal} onClose={() => setShowGSModal(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Ground Station File</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Input
            type="text"
            label={<>Name <span className="text-red-500" aria-hidden="true">*</span></>}
            value={newGSName}
            onChange={(e) => setNewGSName(e.target.value)}
            required
            placeholder="e.g., my_ground_stations"
            className="font-mono bg-light-bg dark:bg-dark-bg"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setShowGSModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
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
        </DialogFooter>
      </Dialog>

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
