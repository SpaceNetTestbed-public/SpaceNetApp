'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

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
        <div>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
            Experiment Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={experimentName}
            onChange={(e) => onExperimentNameChange(e.target.value)}
            className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-maroon/50 resize-none"
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
    </motion.div>
  )
}
