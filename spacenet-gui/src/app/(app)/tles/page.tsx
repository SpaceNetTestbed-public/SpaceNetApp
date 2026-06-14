'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Plus, Trash, Search, Eye, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { TLEFile, TLEContent } from '@/types/types'

export default function TLEPage() {
  const router = useRouter()
  const [TLES, setTLES] = useState<TLEFile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Create Modal State
  const [showTLEModal, setShowTLEModal] = useState(false);
  const [newTLEName, setNewTLEName] = useState("");
  const [newTLEDescription, setNewTLEDescription] = useState("");
  const [newTLEContent, setNewTLEContent] = useState("");
  const [creatingTLE, setCreatingTLE] = useState(false);
  
  // Delete Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<TLEFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTLEFile, setViewTLEFile] = useState<TLEFile | null>(null);
  const [tleContent, setTleContent] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Fetch TLE files
  useEffect(() => {
    const loadTLEFiles = async () => {
      setLoading(true)
      try {
        const data = await apiFetch('/tles') as TLEFile[]
        setTLES(data)
      } catch (err) {
        console.error(err)
        toast.error(getApiErrorMessage(err, 'Failed to load TLE files'), { id: 'tle-files-load' })
      } finally {
        setLoading(false)
      }
    }
    loadTLEFiles()
  }, [])

  // Delete a TLE file
  const deleteTLEFile = async (file: TLEFile) => {
    setIsDeleting(true)
    try {
      await apiFetch(`/tles/${file.id}`, { method: 'DELETE' })
      toast.success(`Deleted "${file.name}"`)
      setTLES(prev => prev.filter(f => f.id !== file.id))
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to delete TLE file'), { id: 'tle-file-delete' })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  // Open View Modal & Fetch Content
  const openViewModal = async (file: TLEFile) => {
    setViewTLEFile(file);
    setShowViewModal(true);
    setIsLoadingContent(true);
    setTleContent(null);

    try {
      // Assuming your backend has an endpoint like this to get the raw config/content
      const content = await apiFetch(`/tles/${file.id}`) as TLEContent;
      setTleContent(content.message);
    } catch (err) {
      console.error("Failed to load TLE content", err);
      toast.error(getApiErrorMessage(err, 'Failed to load TLE content'));
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Filtered list based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return TLES
    return TLES.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [TLES, searchQuery])

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
          TLE Files
        </h1>
        <p className="text-sm text-light-text/60 dark:text-dark-subtext">
          List of all TLE files with descriptions
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
            placeholder="Search TLE files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text"
          />
        </div>
        <Button
            className="bg-maroon hover:bg-maroon-hover text-white"
            onClick={() => {
              setNewTLEName("");
              setNewTLEDescription("");
              setNewTLEContent("");
              setShowTLEModal(true);
            }}
            >
            <Plus className="h-4 w-4 mr-2" /> New TLE
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {filteredFiles.map((file, i) => (
                <motion.tr
                  key={file.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">{file.name}</td>
                  <td className="px-6 py-4 text-sm">{file.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2" 
                        aria-label={`View ${file.name}`}
                        onClick={() => openViewModal(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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

        {filteredFiles.length === 0 && (
          <div className="text-center py-12 text-light-text/60 dark:text-dark-subtext">
            {loading ? 'Loading files...' : 'No TLE files found.'}
          </div>
        )}
      </motion.div>

      {/* Create Modal */}
      {showTLEModal && (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 
                    bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTLEModal(false)}
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
            <h2 className="text-2xl font-semibold mb-4 text-light-text dark:text-dark-text">
                Create TLE File
            </h2>

            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                    Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={newTLEName}
                    onChange={(e) => setNewTLEName(e.target.value)}
                    className="
                    w-full px-3 py-2 rounded-btn font-mono text-sm
                    border border-light-border dark:border-dark-border
                    bg-light-bg dark:bg-dark-bg
                    text-light-text dark:text-dark-text
                    focus:outline-none focus:ring-2 focus:ring-maroon/50
                    "
                    placeholder="e.g., my_tle"
                />
                </div>
                
                <div>
                <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                    Description
                </label>
                <textarea
                  rows={2}
                  value={newTLEDescription}
                  onChange={(e) => setNewTLEDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn font-mono text-sm resize-none border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
                />
                </div>

                {/* TLE Content / File Upload */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                    <span>TLE Data <span className="text-red-500">*</span></span>
                    <label className="cursor-pointer text-maroon hover:text-maroon-hover flex items-center gap-1 text-xs">
                      <Upload className="h-3 w-3" />
                      Upload File
                      <input 
                        type="file" 
                        accept=".txt,.tle" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const text = await file.text();
                            setNewTLEContent(text);
                            // Auto-fill name if it's currently empty
                            if (!newTLEName) {
                              setNewTLEName(file.name.replace(/\.[^/.]+$/, ""));
                            }
                          }
                          // Reset input so the same file can be uploaded again if needed
                          e.target.value = '';
                        }} 
                      />
                    </label>
                  </label>
                  <textarea
                    rows={5}
                    value={newTLEContent}
                    onChange={(e) => setNewTLEContent(e.target.value)}
                    placeholder="Paste TLE data here or upload a file..."
                    className="w-full px-3 py-2 rounded-btn font-mono text-xs resize-none border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
                  />
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
                <Button
                variant="outline"
                onClick={() => setShowTLEModal(false)}
                className="border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                >
                Cancel
                </Button>
                <Button
                className="bg-maroon hover:bg-maroon-hover text-white"
                disabled={creatingTLE || !newTLEName.trim() || !newTLEContent.trim()}
                onClick={async () => {
                    setCreatingTLE(true);
                    try {
                      const data = await apiFetch("/tles", {
                          method: "POST",
                          body: JSON.stringify({ 
                            name: newTLEName.trim(), 
                            description: newTLEDescription.trim(),
                            tle_file: newTLEContent.trim()
                          }),
                      }) as { gs_file_id: string };
                      
                      setShowTLEModal(false);
                      setNewTLEName("");
                      setNewTLEDescription("");
                      setNewTLEContent("");
                      
                      // Refresh the list after successful creation
                      const refreshedData = await apiFetch('/tles') as TLEFile[];
                      setTLES(refreshedData);
                      toast.success("TLE file created successfully");

                    } catch (err) {
                      console.error(err);
                      toast.error(getApiErrorMessage(err, 'Failed to create TLE file'), { id: 'tle-file-create' })
                    } finally {
                      setCreatingTLE(false);
                    }
                }}
                >
                {creatingTLE ? "Creating..." : "Create"}
                </Button>
            </div>
            </motion.div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowViewModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-card shadow-xl p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border my-8"
          >
            <h2 className="text-2xl font-semibold mb-4 text-light-text dark:text-dark-text">
              View TLE: {viewTLEFile?.name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                  Description
                </label>
                <p className="text-sm text-light-text/80 dark:text-dark-subtext mb-3">
                  {viewTLEFile?.description || "No description provided."}
                </p>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                  <span>File Content</span>
                </label>
                
                {isLoadingContent ? (
                  <div className="p-4 text-center text-sm text-light-text/60">
                    Loading content...
                  </div>
                ) : tleContent ? (
                  <div className="mb-2 p-3 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-60 overflow-auto text-light-text dark:text-dark-text whitespace-pre-wrap">
                    {typeof tleContent === 'object' ? JSON.stringify(tleContent, null, 2) : String(tleContent)}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-light-text/60">
                    No content available.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowViewModal(false)}
                className="border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete TLE File"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting..."
        cancelLabel="Cancel"
        variant="danger"
        isConfirming={isDeleting}
        onConfirm={() => deleteConfirm && deleteTLEFile(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}