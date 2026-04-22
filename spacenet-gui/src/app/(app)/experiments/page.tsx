'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Upload, Download, BarChart3, BookOpen, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExperimentGroup } from '@/components/ExperimentGroup'
import { motion } from 'framer-motion'
import { Experiment, CreateExperimentBody, CreateExperimentResponse } from '@/types/types'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'

export default function ExperimentsPage() {
  const router = useRouter()
  // Backend data
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Form fields
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const [tags, setTags] = useState<string[]>([]);  // <-- explicitly typed

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]); // now TypeScript is happy
    }
    setNewTag("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent form submission
      addTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const removeExperiment = (id: string) => {
    setExperiments((prev) => prev.filter((e) => e.id !== id));
  };

  const duplicateExperiment = (id: string) => {
    setDuplicateId(id);
    setShowModal(true);
  };

  useEffect(() => {
    const fetchExperiments = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/experiments') as Experiment[];
        setExperiments(data);
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, 'Failed to load experiments'), { id: 'experiments-load' });
        setExperiments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExperiments();
  }, []);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [sortBy, setSortBy] =
    useState<'Last Updated' | 'Name' | 'Status'>('Last Updated');

  // Build groups from backend tags
  const experimentGroups = useMemo(() => {
  const groupsMap: Record<string, Experiment[]> = {};

  experiments.forEach(exp => {
    const expTags = exp.tags?.length ? exp.tags : ['Untagged'];

    expTags.forEach(tag => {
      if (!groupsMap[tag]) groupsMap[tag] = [];
      groupsMap[tag].push(exp);
    });
  });

  // Sort experiments inside each group
  Object.values(groupsMap).forEach(group => {
    group.sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    );
  });

  return Object.entries(groupsMap).map(([tag, exps]) => ({
    name: tag,
    experiments: exps,
  }));
}, [experiments]);

  // Build filter dropdown (from backend tags)
  const allGroups = useMemo(() => {
    const groups = new Set<string>();

    experiments.forEach(exp => {
      if (exp.tags?.length) {
        exp.tags.forEach(tag => groups.add(tag));
      } else {
        groups.add('Untagged');
      }
    });

    return ['All', ...Array.from(groups)];
}, [experiments]);

  // Apply search + tag filtering
  const filteredGroups = useMemo(() => {
    return experimentGroups
      .filter(group => filterGroup === 'All' || group.name === filterGroup)
      .map(group => ({
        ...group,
        experiments: group.experiments.filter(exp =>
          exp.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(group => group.experiments.length > 0);
  }, [experimentGroups, searchQuery, filterGroup]);

  return (
    <div className="min-h-screen p-6 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Project Management & Experiments
        </h1>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-4 mt-6 mb-8"
      >
        <div className="sm:mr-auto">
          <Button
            className="bg-maroon hover:bg-maroon-hover text-white"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Experiment
          </Button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text placeholder:text-light-text/40 dark:placeholder:text-dark-subtext focus:outline-none focus:ring-2 focus:ring-maroon/50"
          />
        </div>

        {/* Filter by tag */}
        <div className="relative">
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="pl-4 pr-10 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50 appearance-none"
          >
            {allGroups.map(group => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext pointer-events-none" />
        </div>

        {/* Icons */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Upload">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Metrics">
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Docs">
            <BookOpen className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Experiment Groups */}
      <div className="space-y-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group, idx) => (
            <ExperimentGroup key={group.name} group={group} groupIndex={idx} onDelete={removeExperiment} onDuplicate={duplicateExperiment} />
          ))
        ) : (
          <div className="text-center py-12 text-light-text/60 dark:text-dark-subtext">
            {loading ? 'Loading experiments...' : 'No experiments found.'}
          </div>
        )}
      </div>

      {/* New Experiment Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 
                    bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            className="
              w-full max-w-md rounded-card shadow-xl p-6
              bg-light-surface dark:bg-dark-surface
              border border-light-border dark:border-dark-border
            "
          >
            {/* Title */}
            <h2 className="text-2xl font-semibold mb-4 text-light-text dark:text-dark-text">
              Create New Experiment
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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="
                    w-full px-3 py-2 rounded-btn font-mono text-sm
                    border border-light-border dark:border-dark-border
                    bg-light-bg dark:bg-dark-bg
                    text-light-text dark:text-dark-text
                    focus:outline-none focus:ring-2 focus:ring-maroon/50
                  "
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="
                    w-full px-3 py-2 rounded-btn font-mono text-sm resize-none
                    border border-light-border dark:border-dark-border
                    bg-light-bg dark:bg-dark-bg
                    text-light-text dark:text-dark-text
                    focus:outline-none focus:ring-2 focus:ring-maroon/50
                  "
                />
              </div>

              {/* Tag */}
               <div>
                <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                  Tag
                </label>

                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-maroon/20 text-maroon rounded-full text-sm cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </span>
                  ))}
                </div>

                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a tag and press Enter"
                  className="
                    w-full px-3 py-2 rounded-btn font-mono text-sm
                    border border-light-border dark:border-dark-border
                    bg-light-bg dark:bg-dark-bg
                    text-light-text dark:text-dark-text
                    focus:outline-none focus:ring-2 focus:ring-maroon/50
                  "
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowModal(false)}
            className="
                  border-light-border dark:border-dark-border
                  text-light-text dark:text-dark-text
                "
          >
                Cancel
              </Button>

          <Button
                className="bg-maroon hover:bg-maroon-hover text-white"
                disabled={creating || !newName.trim()}
                onClick={async () => {
                  setCreating(true);
                  try {
                    const body: CreateExperimentBody = { name: newName.trim() };
                    if (newDescription.trim()) body.description = newDescription.trim();
                    // if (newTag.trim()) body.tag = newTag.trim();
                    if (tags) body.tags = tags;

                    let expId = ''
                    if (duplicateId === null) {
                      const newExp = await apiFetch('/experiments', {
                        method: 'POST',
                        body: JSON.stringify(body),
                      }) as CreateExperimentResponse;
                      expId = newExp.experiment_id
                    } else {
                      const newExp = await apiFetch(`/experiments/${duplicateId}/duplicate`, {
                        method: 'POST',
                        body: JSON.stringify(body),
                      }) as CreateExperimentResponse;
                      expId = newExp.experiment_id
                    }
                    setDuplicateId(null)
                    setShowModal(false);
                    setNewName('');
                    setTags([])
                    setNewDescription('');
                    setNewTag('');
                    router.push(`/experiments/${expId}/edit`)
                  } catch (err) {
                    console.error(err);
                    toast.error(getApiErrorMessage(err, 'Failed to create experiment'), { id: 'experiment-create' });
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}
