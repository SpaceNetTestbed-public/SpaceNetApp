'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, BookOpen, ChevronDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExperimentGroup } from '@/components/ExperimentGroup'
import { motion } from 'framer-motion'
import { DocsDrawer } from '@/components/DocsDrawer'
import { Experiment, CreateExperimentBody, CreateExperimentResponse, GroundStationFileSummary } from '@/types/types'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import yaml from "js-yaml"

function ExperimentCardSkeleton() {
  return (
    <div className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 bg-light-border dark:bg-dark-border rounded w-2/3" />
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-light-border dark:bg-dark-border" />
          <div className="h-3 bg-light-border dark:bg-dark-border rounded w-16" />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="h-4 bg-light-border dark:bg-dark-border rounded w-full" />
        <div className="h-4 bg-light-border dark:bg-dark-border rounded w-4/5" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-light-border dark:bg-dark-border rounded-full" />
        <div className="h-5 w-16 bg-light-border dark:bg-dark-border rounded-full" />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <div className="h-5 w-12 bg-light-border dark:bg-dark-border rounded-full" />
        <div className="h-5 w-16 bg-light-border dark:bg-dark-border rounded-full" />
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-light-border dark:border-dark-border">
        <div className="h-4 w-24 bg-light-border dark:bg-dark-border rounded mr-auto" />
        <div className="h-9 w-28 bg-light-border dark:bg-dark-border rounded-btn" />
        <div className="h-9 w-36 bg-light-border dark:bg-dark-border rounded-btn" />
        <div className="h-9 w-9 bg-light-border dark:bg-dark-border rounded-btn" />
      </div>
    </div>
  )
}

export default function ExperimentsPage() {
  const router = useRouter()
  // Backend data
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editExperiment, setEditExperiment] = useState<Experiment | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  // Form fields
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [gsFile, setGSFile] = useState(-1);

  const [isCustom, setIsCustom] = useState(false);
  const [gsFiles, setGsFiles] = useState<GroundStationFileSummary[]>([]);
  const [yamlFile, setYamlFile] = useState<File | null>(null);
  const [yamlFile1, setYamlFile1] = useState<File | null>(null);
  const [yamlFile2, setYamlFile2] = useState<File | null>(null);
  const [deleteMN, setDeleteMN] = useState<boolean | null>(false);
  const [deleteMNConfirm, setDeleteMNConfirm] = useState(false);
  const [deletingMN, setDeletingMN] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => {
      const fetchGSFiles = async () => {
        try {
          const data = await apiFetch("/ground_station_file") as GroundStationFileSummary[];
          setGsFiles(data);
        } catch (err) {
          console.error("Failed to load GS files:", err)
          toast.error(getApiErrorMessage(err, 'Failed to load ground station files'), { id: 'main-config-gs-files' })
        }
      };
      fetchGSFiles();
    }, []); // only fetch files once

  // Existing Configs State
  const [existingConfigs, setExistingConfigs] = useState<{
    main: any;
    sat: any;
    mininet: any;
  }>({
    main: null,
    sat: null,
    mininet: null,
  });

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setTags([]);
    setNewTag('');
    setIsCustom(false);
    setYamlFile(null);
    setYamlFile1(null);
    setYamlFile2(null);
    setExistingConfigs({ main: null, sat: null, mininet: null });
    setDuplicateId(null);
    setEditExperiment(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const fetchConfigs = async (id: string) => {
    try {
      // Use Promise.allSettled in case some configs don't exist yet
      const [main, sat, mininet] = await Promise.allSettled([
        apiFetch(`/experiments/${id}/main`),
        apiFetch(`/experiments/${id}/sat`),
        apiFetch(`/experiments/${id}/main-mn`),
      ]);

      setExistingConfigs({
        main: main.status === 'fulfilled' ? main.value : null,
        sat: sat.status === 'fulfilled' ? sat.value : null,
        mininet: mininet.status === 'fulfilled' ? mininet.value : null,
      });
    } catch (err) {
      console.error("Error fetching configs:", err);
    }
  };

  const openEditModal = async (exp: Experiment) => {
    resetForm();
    setEditExperiment(exp);

    // preload form
    setNewName(exp.name);
    setNewDescription(exp.description || '');
    setTags(exp.tags || []);
    setIsCustom(exp.is_custom || false);

    if (exp.is_custom) {
      await fetchConfigs(exp.id);
    }

    setShowModal(true);
  };

  const duplicateExperiment = (id: string) => {
    resetForm();
    setDuplicateId(id);
    setShowModal(true);
  };

  const deleteConfig = (type: 'main' | 'sat') => {
    if (!editExperiment) return;
    setExistingConfigs((prev) => ({ ...prev, [type]: null }));
    toast.success(`${type.toUpperCase()} config replaced — save to apply changes.`);
  };

  const handleDeleteMininetConfig = async () => {
    if (!editExperiment) return;
    setDeletingMN(true);
    try {
      await apiFetch(`/experiments/${editExperiment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ main_mn_config: {} }),
      });
      setExistingConfigs((prev) => ({ ...prev, mininet: null }));
      setDeleteMN(false);
      setDeleteMNConfirm(false);
      setShowModal(false);
      resetForm();
      toast.success('Mininet configuration removed');
      await fetchExperiments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove Mininet configuration'), { id: 'mn-config-delete' });
    } finally {
      setDeletingMN(false);
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTag("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const removeExperiment = (id: string) => {
    setExperiments((prev) => prev.filter((e) => e.id !== id));
  };

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

  useEffect(() => {
    fetchExperiments();
  }, []);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [sortBy, setSortBy] = useState<'Last Updated' | 'Name' | 'Status'>('Last Updated');

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
            onClick={openCreateModal}
            aria-label="Create new experiment"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            New Experiment
          </Button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search projects..."
            aria-label="Search projects"
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
            aria-label="Filter by tag"
            className="pl-4 pr-10 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50 appearance-none"
          >
            {allGroups.map(group => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext pointer-events-none" aria-hidden="true" />
        </div>

        {/* Icons */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Open documentation"
            onClick={() => setDocsOpen(true)}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </motion.div>

      {/* Experiment Groups */}
      <div className="space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ExperimentCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group, idx) => (
            <ExperimentGroup 
              key={group.name} 
              group={group} 
              groupIndex={idx} 
              onDelete={removeExperiment} 
              onDuplicate={duplicateExperiment}
              onEdit={openEditModal} // Passed edit handler here
            />
          ))
        ) : (
          <div className="text-center py-12 text-light-text/60 dark:text-dark-subtext">
            No experiments found.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[50vh] overflow-y-auto rounded-card shadow-xl p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border my-8"
          >
            <h2 className="text-2xl font-semibold mb-4 text-light-text dark:text-dark-text">
              {editExperiment ? "Edit Experiment" : (duplicateId ? "Duplicate Experiment" : "Create New Experiment")}
            </h2>

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
                  className="w-full px-3 py-2 rounded-btn font-mono text-sm border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
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
                  className="w-full px-3 py-2 rounded-btn font-mono text-sm resize-none border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
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
                  className="w-full px-3 py-2 rounded-btn font-mono text-sm border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
                />
              </div>

              {/* Custom Experiment Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={isCustom}
                  disabled={editExperiment !== null} // Prevents changing type during edit
                  onChange={(e) => setIsCustom(e.target.checked)}
                  className="h-4 w-4"
                />
                <label className="text-sm text-light-text dark:text-dark-text">
                  Custom Experiment (upload YAML)
                </label>
              </div>

              {/* Config Files Section (only if custom is checked) */}
              {isCustom && (
                <div className="space-y-4 pt-2 border-t border-light-border dark:border-dark-border">
                  <p className="text-sm text-light-text/80 dark:text-dark-subtext mb-3 line-clamp-2">
                    For custom configurations, please export non-custom YAML first to understand defaults and other settings.
                  </p>
                  <p className="text-sm text-light-text/80 dark:text-dark-subtext mb-3 line-clamp-2">
                    The output path would automatically be added. Other paths are relative to the spacenet-backend folder.
                  </p>
                  {/* To be added later */}
                  {/* <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
                      Ground Station File
                    </label>

                    <select
                      value={gsFile}
                      onChange={(e) => {setGSFile(parseInt(e.target.value) || -1);}}
                      className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50 text-sm"
                    >
                      <option value={-1}>default</option>
                      {gsFiles.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  </div> */}
                  {/* MAIN CONFIG */}
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                      <span>Main Config YAML</span>
                    </label>
                    {editExperiment && existingConfigs.main && (
                      <div className="mb-2 p-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-40 overflow-auto text-light-text dark:text-dark-text">
                        <pre>{JSON.stringify(existingConfigs.main, null, 2)}</pre>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".yaml,.yml"
                      onChange={(e) => {
                        if (editExperiment && existingConfigs.main) deleteConfig('main');
                        setYamlFile(e.target.files?.[0] || null);
                      }}
                      className="w-full px-3 py-2 rounded-btn text-sm border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text"
                    />
                    {editExperiment && <p className="text-xs mt-1 text-gray-500">Uploading a new file will replace the existing configuration.</p>}
                  </div>

                  {/* SAT CONFIG */}
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                      <span>SAT Config YAML</span>
                    </label>
                    {editExperiment && existingConfigs.sat && (
                      <div className="mb-2 p-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-40 overflow-auto text-light-text dark:text-dark-text">
                        <pre>{JSON.stringify(existingConfigs.sat, null, 2)}</pre>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".yaml,.yml"
                      onChange={(e) => {
                        if (editExperiment && existingConfigs.sat) deleteConfig('sat');
                        setYamlFile1(e.target.files?.[0] || null);
                      }}
                      className="w-full px-3 py-2 rounded-btn text-sm border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text"
                    />
                  </div>

                  {/* MININET CONFIG */}
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                      <span>Mininet Config YAML</span>
                      {editExperiment && existingConfigs.mininet && (
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => setDeleteMNConfirm(true)}
                           className="h-6 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                           aria-label="Delete Mininet configuration"
                         >
                           <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" /> Delete
                         </Button>
                      )}
                    </label>
                    {editExperiment && existingConfigs.mininet && (
                      <div className="mb-2 p-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-40 overflow-auto text-light-text dark:text-dark-text">
                        <pre>{JSON.stringify(existingConfigs.mininet, null, 2)}</pre>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".yaml,.yml"
                      onChange={(e) => {
                        if (editExperiment && existingConfigs.mininet) {
                          setExistingConfigs((prev) => ({ ...prev, mininet: null }));
                        }
                        setYamlFile2(e.target.files?.[0] || null);
                        setDeleteMN(false);
                      }}
                      className="w-full px-3 py-2 rounded-btn text-sm border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text"
                    />
                  </div>

                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                Cancel
              </Button>

              <Button
                className="bg-maroon hover:bg-maroon-hover text-white"
                disabled={creating || !newName.trim()}
                onClick={async () => {
                  setCreating(true);
                  try {
                    const body: CreateExperimentBody = { name: newName.trim(), is_custom: isCustom };
                    if (newDescription.trim()) body.description = newDescription.trim();
                    if (tags) body.tags = tags;

                    if (deleteMN) {
                      body.main_mn_config = {};
                    }

                    // Handle YAML file overrides
                    if (isCustom && yamlFile) {
                      const text = await yamlFile.text();
                      const con = yaml.load(text) as Record<string, any>;
                      body.main_config = con;
                    }
                    if (isCustom && yamlFile1) {
                      const text1 = await yamlFile1.text();
                      const con = yaml.load(text1) as Record<string, any>;
                      body.sat_config = con;
                    }
                    if (isCustom && yamlFile2) {
                      const text2 = await yamlFile2.text();
                      const con = yaml.load(text2) as Record<string, any>;
                      body.main_mn_config = con;
                    }

                    let expId = '';
                    
                    if (editExperiment) {
                      await apiFetch(`/experiments/${editExperiment.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(body),
                      });
                      expId = editExperiment.id;
                      toast.success('Experiment updated successfully');
                    } else if (duplicateId !== null) {
                      const newExp = await apiFetch(`/experiments/${duplicateId}/duplicate`, {
                        method: 'POST',
                        body: JSON.stringify(body),
                      }) as CreateExperimentResponse;
                      expId = newExp.experiment_id;
                      toast.success('Experiment duplicated');
                    } else {
                      const newExp = await apiFetch('/experiments', {
                        method: 'POST',
                        body: JSON.stringify(body),
                      }) as CreateExperimentResponse;
                      expId = newExp.experiment_id;
                      toast.success('Experiment created');
                    }

                    const wasCustom = isCustom; // capture before reset
                    const wasEdit = !!editExperiment;
                    
                    resetForm();
                    setShowModal(false);
                    
                    // Route or refresh logic
                    if (!wasEdit && !wasCustom)  {
                      router.push(`/experiments/${expId}/edit`);
                    } else {
                      await fetchExperiments();
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error(getApiErrorMessage(err, 'Failed to save experiment'), { id: 'experiment-save' });
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? (editExperiment ? "Saving..." : "Creating...") : (editExperiment ? "Save" : "Create")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <DocsDrawer open={docsOpen} onClose={() => setDocsOpen(false)} />

      <ConfirmDialog
        isOpen={deleteMNConfirm}
        title="Remove Mininet Configuration"
        message="Are you sure you want to permanently remove the Mininet configuration? This cannot be undone."
        confirmLabel="Remove"
        confirmLoadingLabel="Removing…"
        cancelLabel="Cancel"
        variant="danger"
        isConfirming={deletingMN}
        onConfirm={handleDeleteMininetConfig}
        onCancel={() => setDeleteMNConfirm(false)}
      />
    </div>
  )
}