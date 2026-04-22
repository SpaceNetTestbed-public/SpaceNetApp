'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ExperimentGroup as ExperimentGroupType } from '@/types/types'
import { ExperimentCard } from './ExperimentCard'

interface ExperimentGroupProps {
  group: ExperimentGroupType
  groupIndex: number
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

export function ExperimentGroup({ group, groupIndex, onDelete, onDuplicate }: ExperimentGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="mb-6">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 rounded-card bg-maroon/10 dark:bg-maroon/20 border border-maroon/20 dark:border-maroon/30 mb-4 hover:bg-maroon/15 dark:hover:bg-maroon/25 transition-colors"
      >
        <span className="font-semibold text-maroon dark:text-maroon">
          {group.name} ({group.experiments.length} {group.experiments.length === 1 ? 'project' : 'projects'})
        </span>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-maroon dark:text-maroon" />
        ) : (
          <ChevronRight className="h-5 w-5 text-maroon dark:text-maroon" />
        )}
      </button>

      {/* Experiment Cards Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {group.experiments.map((experiment, idx) => (
            <ExperimentCard key={experiment.id} experiment={experiment} index={groupIndex * 10 + idx} onDelete={onDelete} onDuplicate={onDuplicate} />
          ))}
        </div>
      )}
    </div>
  )
}

