'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Play, MoreVertical, Trash2, Copy } from 'lucide-react'
import { Button } from './ui/button'
import { Experiment } from '@/types/types'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { useState } from 'react'
import { ConfirmDialog } from './ui/confirm-dialog'

interface ExperimentCardProps {
  experiment: Experiment
  index: number
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onEdit: (exp: Experiment) => void
}

export function ExperimentCard({ experiment, index, onDelete , onDuplicate, onEdit}: ExperimentCardProps) {
  const router = useRouter()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // const canRunSimulation = experiment.hasPhase1 || experiment.hasPhase2;
  const { hasPhase1, hasPhase2 } = experiment;

  // Delete handler
  const handleDeleteExperiment = async () => {
    setIsDeleting(true)
    try {
      await apiFetch(`/experiments/${experiment.id}`, { method: 'DELETE' })
      toast.success('Experiment deleted')
      onDelete(experiment.id)
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to delete experiment'), { id: 'experiment-delete' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDuplicateExperiment = async() => {
    onDuplicate(experiment.id)
  }

  const handleRunSimulation = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(`/experiments/${experiment.id}/simulate`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Status badge config
  const statusBadge = hasPhase2
    ? { dot: 'bg-green-500', label: 'Complete', color: 'text-green-500', pulse: false }
    : hasPhase1
    ? { dot: 'bg-amber-500', label: 'Phase 1 Only', color: 'text-amber-500', pulse: false }
    : { dot: 'bg-red-400', label: 'No Output', color: 'text-red-400', pulse: true }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03, ease: 'easeOut' }}
    >
      <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6 hover:shadow-card-2 transition-shadow">
        {/* Header with name and status */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {experiment.name}
          </h3>
          <div className={`flex items-center ${statusBadge.color}`}>
            <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${statusBadge.dot}${statusBadge.pulse ? ' animate-pulse' : ''}`} />
            <span className="text-xs font-medium">{statusBadge.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-light-text/80 dark:text-dark-subtext mb-3 line-clamp-2">
          {experiment.description}
        </p>

        {/* No Experiment exists */}
        {!experiment.hasExperiment && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            The experiment folder does not exist. Either delete it or drag the experiment folder inside the workspace.
          </p>
        )}

        {/* Phase progress */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasPhase1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
            Phase 1
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasPhase2 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
            Phase 2
          </span>
        </div>

        {/* Tags */}
        {experiment.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {experiment.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-light-border dark:bg-dark-border text-light-text/70 dark:text-dark-subtext"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-light-border dark:border-dark-border">
          {experiment.created_at && (
            <span className="text-xs text-light-text/50 dark:text-dark-subtext/70 mr-auto">
              {formatDate(experiment.created_at)}
            </span>
          )}
          <Link href={`/experiments/${experiment.id}/edit`} className={experiment.created_at ? '' : 'flex-1'}  onClick={(e) => { if (experiment.is_custom){e.preventDefault()}  }}>
            <Button variant="outline" className={experiment.created_at ? '' : 'w-full'}  disabled={experiment.is_custom || !experiment.hasExperiment} aria-label={`Edit configuration for ${experiment.name}`}>
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit Config
            </Button>
          </Link>
          <Button
            className={`${!experiment.created_at ? 'flex-1 ' : ''}${true ? 'bg-maroon hover:bg-maroon-hover text-white' : 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-50'}`}
            onClick={handleRunSimulation}
            disabled={!experiment.hasExperiment}
            // disabled={!canRunSimulation}
          >
            <Play className="h-4 w-4 mr-2" />
            Run Simulation
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0" aria-label={`Open actions for ${experiment.name}`}>
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content
              className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-md min-w-[140px] py-1"
              side="bottom"
              align="start"
              sideOffset={0}
            >
              <DropdownMenu.Item
                disabled={!experiment.hasExperiment}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-md"
                onSelect={() => onEdit(experiment)}
                aria-label={`Edit ${experiment.name}`}
              >
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-md"
                onSelect={() => handleDuplicateExperiment()}
                aria-label={`Duplicate ${experiment.name}`}
                disabled={!experiment.hasExperiment}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer rounded-md"
                onSelect={() => setShowDeleteConfirm(true)}
                aria-label={`Delete ${experiment.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Experiment"
        message={`Are you sure you want to delete "${experiment.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting..."
        cancelLabel="Cancel"
        variant="danger"
        isConfirming={isDeleting}
        onConfirm={handleDeleteExperiment}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  )
}
