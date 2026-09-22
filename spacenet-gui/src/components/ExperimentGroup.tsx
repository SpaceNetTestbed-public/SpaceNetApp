'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Experiment, ExperimentGroup as ExperimentGroupType } from '@/types/types'
import { ExperimentCard } from './ExperimentCard'

interface ExperimentGroupProps {
  group: ExperimentGroupType
  groupIndex: number
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onEdit: (exp: Experiment) => void
}

export function ExperimentGroup({ group, groupIndex, onDelete, onDuplicate, onEdit }: ExperimentGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="mb-6">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between p-4 rounded-card bg-vt-maroon/10 dark:bg-vt-maroon/20 border border-vt-maroon/20 dark:border-vt-maroon/30 mb-4 hover:bg-vt-maroon/15 dark:hover:bg-vt-maroon/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="font-semibold text-vt-maroon dark:text-vt-maroon">
          {group.name} ({group.experiments.length} {group.experiments.length === 1 ? 'project' : 'projects'})
        </span>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-vt-maroon dark:text-vt-maroon" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-5 w-5 text-vt-maroon dark:text-vt-maroon" aria-hidden="true" />
        )}
      </button>

      {/* Experiment Cards Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {group.experiments.map((experiment, idx) => (
            <ExperimentCard key={experiment.id} experiment={experiment} index={groupIndex * 10 + idx} onDelete={onDelete} onDuplicate={onDuplicate} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

