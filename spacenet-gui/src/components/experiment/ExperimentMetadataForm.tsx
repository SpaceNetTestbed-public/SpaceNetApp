'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Input, Textarea } from '@/components/ui/input'

interface ExperimentMetadataFormProps {
  experimentName: string
  description: string
  tags: string[]
  onExperimentNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTagsChange: (value: string[]) => void
}

export function ExperimentMetadataForm({
  experimentName,
  description,
  tags,
  onExperimentNameChange,
  onDescriptionChange,
  onTagsChange,
}: ExperimentMetadataFormProps) {
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]); // now TypeScript is happy
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
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border p-6 mb-6"
    >
      <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
        Profile Metadata
      </h2>
      <div className="space-y-4">
        <Input
          type="text"
          label={<>Experiment Name <span className="text-red-500" aria-hidden="true">*</span></>}
          value={experimentName}
          onChange={(e) => onExperimentNameChange(e.target.value)}
          error={!experimentName.trim() ? 'Experiment name is required' : undefined}
          required
          className="bg-light-bg dark:bg-dark-bg"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="bg-light-bg dark:bg-dark-bg resize-none"
        />
        {/* Tag */}
        <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-label={`Remove tag ${tag}`}
              className="px-2 py-1 bg-vt-maroon/20 text-vt-maroon rounded-full text-sm cursor-pointer hover:bg-vt-maroon/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => removeTag(tag)}
            >
              {tag} ×
            </button>
          ))}
        </div>

        <Input
          type="text"
          label="Tag"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a tag and press Enter"
          className="font-mono bg-light-bg dark:bg-dark-bg"
        />
      </div>
      </div>
    </motion.div>
  )
}
