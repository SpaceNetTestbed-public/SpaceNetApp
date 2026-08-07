'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, BookOpen, ChevronDown, Trash2, Upload } from 'lucide-react'
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
  const [zipFile, setZipFile] = useState<File | null>(null);
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
    setZipFile(null);
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
      toast.error(getApiErrorMessage(err, 'Failed to load existing experiment configs'), { id: 'experiment-fetch-configs' });
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

        {/* Icons
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            style={{marginTop: '3px'}}
            aria-label="Sync Experiments Folder"
            onClick={() => syncExperimentsFolder()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div> */}
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
              onEdit={openEditModal} 
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
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-card shadow-xl p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border my-8"
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
                      className="px-2 py-1 bg-maroon/20 text-maroon rounded-full text-sm cursor-pointer hover:bg-maroon/30 transition-colors"
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

              {/* Custom Experiment Toggle & Files (HIDDEN DURING DUPLICATION) */}
              {!duplicateId && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isCustomToggle"
                      checked={isCustom}
                      disabled={editExperiment !== null} // Prevents changing type during edit
                      onChange={(e) => setIsCustom(e.target.checked)}
                      className="h-4 w-4 rounded border-light-border text-maroon focus:ring-maroon cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="isCustomToggle" className="text-sm font-medium text-light-text dark:text-dark-text cursor-pointer">
                      Custom Experiment (upload YAML/ZIP)
                    </label>
                  </div>

                  {/* Config Files Section (only if custom is checked) */}
                  {isCustom && (
                    <div className="space-y-6 pt-4 border-t border-light-border dark:border-dark-border">
                      <div className="bg-light-surface/50 dark:bg-dark-surface/50 p-3 rounded-md text-sm text-light-text/80 dark:text-dark-subtext space-y-2 border border-light-border/50 dark:border-dark-border/50">
                        <p>For custom configurations, please export non-custom YAML first to understand defaults and other settings.</p>
                        <p>The output path would automatically be added. Other paths are relative to the spacenet-backend folder.</p>
                      </div>

                      {/* Hide individual YAML uploads if a ZIP file is selected */}
                      {!zipFile && (
                        <div className="space-y-6 pt-2">
                          {/* MAIN CONFIG */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                              Main Config YAML
                            </label>
                            
                            {editExperiment && existingConfigs.main && !yamlFile && (
                              <div className="p-3 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-40 overflow-auto text-light-text dark:text-dark-text">
                                <pre>{JSON.stringify(existingConfigs.main, null, 2)}</pre>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <label className="flex-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept=".yaml,.yml"
                                  className="hidden"
                                  onChange={(e) => {
                                    deleteConfig('main'); 
                                    setYamlFile(e.target.files?.[0] || null);
                                  }}
                                />
                                <div className={`flex items-center justify-center w-full px-4 py-2.5 border border-dashed rounded-btn transition-colors ${yamlFile ? 'border-maroon bg-maroon/5 text-maroon' : 'border-light-border dark:border-dark-border hover:border-maroon hover:bg-maroon/5 text-light-text dark:text-dark-text'}`}>
                                  <Upload className="w-4 h-4 mr-2" />
                                  <span className="text-sm font-medium truncate">
                                    {yamlFile ? yamlFile.name : 'Upload Main YAML'}
                                  </span>
                                </div>
                              </label>
                              {yamlFile && (
                                <Button 
                                  variant="ghost" 
                                  className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => setYamlFile(null)}
                                  title="Clear file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {editExperiment && !yamlFile && (
                              <p className="text-xs text-light-text/60 dark:text-dark-subtext">Uploading a new file will replace the existing configuration.</p>
                            )}
                          </div>

                          {/* SAT CONFIG */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                              SAT Config YAML
                            </label>
                            
                            {editExperiment && existingConfigs.sat && !yamlFile1 && (
                              <div className="p-3 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-40 overflow-auto text-light-text dark:text-dark-text">
                                <pre>{JSON.stringify(existingConfigs.sat, null, 2)}</pre>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <label className="flex-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept=".yaml,.yml"
                                  className="hidden"
                                  onChange={(e) => {
                                    deleteConfig('sat');
                                    setYamlFile1(e.target.files?.[0] || null);
                                  }}
                                />
                                <div className={`flex items-center justify-center w-full px-4 py-2.5 border border-dashed rounded-btn transition-colors ${yamlFile1 ? 'border-maroon bg-maroon/5 text-maroon' : 'border-light-border dark:border-dark-border hover:border-maroon hover:bg-maroon/5 text-light-text dark:text-dark-text'}`}>
                                  <Upload className="w-4 h-4 mr-2" />
                                  <span className="text-sm font-medium truncate">
                                    {yamlFile1 ? yamlFile1.name : 'Upload SAT YAML'}
                                  </span>
                                </div>
                              </label>
                              {yamlFile1 && (
                                <Button 
                                  variant="ghost" 
                                  className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => setYamlFile1(null)}
                                  title="Clear file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* MININET CONFIG */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-light-text dark:text-dark-text">
                                Mininet Config YAML
                              </label>
                              {editExperiment && existingConfigs.mininet && !yamlFile2 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setExistingConfigs((prev) => ({ ...prev, mininet: null }));
                                    setDeleteMN(true);
                                    toast.success("MININET config replaced — save to apply changes.");
                                  }} 
                                  className="h-6 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" /> Delete Existing
                                </Button>
                              )}
                            </div>
                            
                            {editExperiment && existingConfigs.mininet && !yamlFile2 && (
                              <div className="p-3 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-xs font-mono max-h-40 overflow-auto text-light-text dark:text-dark-text">
                                <pre>{JSON.stringify(existingConfigs.mininet, null, 2)}</pre>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <label className="flex-1 cursor-pointer">
                                <input
                                  type="file"
                                  accept=".yaml,.yml"
                                  className="hidden"
                                  onChange={(e) => {
                                    setExistingConfigs((prev) => ({ ...prev, mininet: null }));
                                    setYamlFile2(e.target.files?.[0] || null); 
                                    setDeleteMN(false);
                                  }}
                                />
                                <div className={`flex items-center justify-center w-full px-4 py-2.5 border border-dashed rounded-btn transition-colors ${yamlFile2 ? 'border-maroon bg-maroon/5 text-maroon' : 'border-light-border dark:border-dark-border hover:border-maroon hover:bg-maroon/5 text-light-text dark:text-dark-text'}`}>
                                  <Upload className="w-4 h-4 mr-2" />
                                  <span className="text-sm font-medium truncate">
                                    {yamlFile2 ? yamlFile2.name : 'Upload Mininet YAML'}
                                  </span>
                                </div>
                              </label>
                              {yamlFile2 && (
                                <Button 
                                  variant="ghost" 
                                  className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => setYamlFile2(null)}
                                  title="Clear file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ZIP PAYLOAD */}
                      {(!existingConfigs.main && !yamlFile) && (
                        <div className={`space-y-2 ${!zipFile ? 'pt-4 mt-4 border-t border-light-border/50 dark:border-dark-border/50' : 'pt-2'}`}>
                          <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                            Experiment Payload (.zip)
                          </label>
                          <p className="text-xs text-light-text/60 dark:text-dark-subtext mb-2">
                            Upload any required scripts, binaries, or assets as a zipped directory.
                          </p>
                          
                          <div className="flex items-center gap-2">
                            <label className="flex-1 cursor-pointer">
                              <input
                                type="file"
                                accept=".zip,application/zip"
                                className="hidden"
                                onChange={(e) => {
                                  setZipFile(e.target.files?.[0] || null);
                                  if (e.target.files?.[0]) {
                                    setYamlFile(null);
                                    setYamlFile1(null);
                                    setYamlFile2(null);
                                  }
                                }}
                              />
                              <div className={`flex items-center justify-center w-full px-4 py-2.5 border border-dashed rounded-btn transition-colors ${zipFile ? 'border-maroon bg-maroon/5 text-maroon' : 'border-light-border dark:border-dark-border hover:border-maroon hover:bg-maroon/5 text-light-text dark:text-dark-text'}`}>
                                <Upload className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium truncate">
                                  {zipFile ? zipFile.name : 'Upload .zip Archive'}
                                </span>
                              </div>
                            </label>
                            {zipFile && (
                              <Button 
                                variant="ghost" 
                                className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => setZipFile(null)}
                                title="Clear file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-light-border dark:border-dark-border">
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
                    const formData = new FormData();
                    
                    formData.append('name', newName.trim());
                    formData.append('is_custom', String(isCustom));
                    
                    if (newDescription.trim()) formData.append('description', newDescription.trim());
                    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));
                    if (deleteMN) formData.append('main_mn_config', JSON.stringify({}));

                    if (isCustom && yamlFile) {
                      const text = await yamlFile.text();
                      const con = yaml.load(text) as Record<string, any>;
                      formData.append('main_config', JSON.stringify(con));
                    }
                    if (isCustom && yamlFile1) {
                      const text1 = await yamlFile1.text();
                      const con = yaml.load(text1) as Record<string, any>;
                      formData.append('sat_config', JSON.stringify(con));
                    }
                    if (isCustom && yamlFile2) {
                      const text2 = await yamlFile2.text();
                      const con = yaml.load(text2) as Record<string, any>;
                      formData.append('main_mn_config', JSON.stringify(con));
                    }

                    if (isCustom && zipFile) {
                      formData.append('experiment_payload', zipFile); 
                    }

                    let expId = '';
                    
                    if (editExperiment) {
                      await apiFetch(`/experiments/${editExperiment.id}`, {
                        method: 'PUT',
                        body: formData, 
                      });
                      expId = editExperiment.id;
                      toast.success('Experiment updated successfully');
                    } else if (duplicateId !== null) {
                    // Construct a JSON payload from the form state
                    const duplicatePayload = {
                      name: newName.trim(),
                      description: newDescription.trim() || undefined,
                      tags: tags.length > 0 ? tags : undefined,
                    };

                    const newExp = await apiFetch(`/experiments/${duplicateId}/duplicate`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(duplicatePayload),
                    }) as CreateExperimentResponse;

                    expId = newExp.experiment_id;
                    toast.success('Experiment duplicated');
                    } else {
                      const newExp = await apiFetch('/experiments', {
                        method: 'POST',
                        body: formData,
                      }) as CreateExperimentResponse;
                      expId = newExp.experiment_id;
                      toast.success('Experiment created');
                    }

                    const wasCustom = isCustom; 
                    const wasEdit = !!editExperiment;
                    
                    resetForm();
                    setShowModal(false);
                    
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