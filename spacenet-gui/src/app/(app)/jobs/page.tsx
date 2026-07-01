'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, FileText, CheckCircle2, Clock, PlayCircle, XCircle, Loader2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface JobStatusBadgeEntry {
  bg: string
  icon: LucideIcon
}

interface JobItem {
  job_id: string
  experiment_name: string
  position: number
  created_at: string
  status: string // queued, started, finished, failed
  running: boolean
  phase: string
  args: unknown[]
}

function JobTableSkeleton() {
  return (
    <>
      <tr role="status" aria-live="polite">
        <td colSpan={6} className="sr-only">Loading jobs…</td>
      </tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4"><div className="h-4 bg-light-border dark:bg-dark-border rounded w-40" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-light-border dark:bg-dark-border rounded w-16" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-light-border dark:bg-dark-border rounded w-36" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-light-border dark:bg-dark-border rounded w-8" /></td>
          <td className="px-6 py-4"><div className="h-5 bg-light-border dark:bg-dark-border rounded-full w-20" /></td>
          <td className="px-6 py-4"><div className="h-8 bg-light-border dark:bg-dark-border rounded w-16" /></td>
        </tr>
      ))}
    </>
  )
}

export default function JobQueuePage() {
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [loadingQueue, setLoadingQueue] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null)
  const [logs, setLogs] = useState("")
  const [loadingLogsJobId, setLoadingLogsJobId] = useState<string | null>(null)
  const [cancelingJobId, setCancelingJobId] = useState<string | null>(null)

  // Fetch queue items on mount & poll every 5s
  useEffect(() => {
    let isMounted = true

    const fetchJobs = async (isFirst: boolean) => {
      if (isFirst) setLoadingQueue(true)
      try {
        const data = await apiFetch('/jobs') as JobItem[]
        if (isMounted) setJobs(data)
      } catch (err) {
        if (isFirst) {
          console.error(err)
          toast.error(getApiErrorMessage(err, 'Failed to load job queue'), { id: 'jobs-queue-load' })
          if (isMounted) setJobs([])
        }
        // poll failures are silently ignored
      } finally {
        if (isFirst && isMounted) setLoadingQueue(false)
      }
    }

    fetchJobs(true)
    const interval = setInterval(() => fetchJobs(false), 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const filteredJobs = useMemo(() => {
    // Sort oldest → newest
    const sorted = [...jobs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  
    if (!searchQuery) return sorted
  
    const q = searchQuery.toLowerCase()
  
    return sorted.filter(
      (job) =>
        job.job_id.toLowerCase().includes(q) ||
        job.experiment_name.toLowerCase().includes(q)
    )
  }, [searchQuery, jobs])

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  const openLogs = async (job: JobItem) => {
    if (loadingLogsJobId) return
    setLoadingLogsJobId(job.job_id)
    try {
      const data = await apiFetch(`/jobs/${job.job_id}/logs`) as { logs: string }
      setLogs(data.logs)
      setSelectedJob(job)
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to load logs'), { id: 'job-logs-load' })
    } finally {
      setLoadingLogsJobId(null)
    }
  }

  const cancelJob = async (job: JobItem) => {
    if (cancelingJobId) return
    setCancelingJobId(job.job_id)
    try {
      await apiFetch(`/jobs/${job.job_id}/cancel`, { method: 'DELETE' })
      toast.success(`Job ${job.job_id} canceled`)
      try {
        setLoadingQueue(true)
        const data = await apiFetch('/jobs') as JobItem[]
        setJobs(data)
      } catch (err) {
        console.error(err)
        toast.error(getApiErrorMessage(err, 'Failed to load job queue'), { id: 'jobs-queue-load' })
      } finally {
        setLoadingQueue(false)
      }
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to cancel job'), { id: 'job-cancel' })
    } finally {
      setCancelingJobId(null)
    }
  }

  const getStatusBadge = (job: JobItem) => {
    const { status, running } = job
    const s = running ? 'started' : status

    const map: Record<string, JobStatusBadgeEntry> = {
      queued: {
        bg: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        icon: Clock,
      },
      started: {
        bg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
        icon: PlayCircle,
      },
      finished: {
        bg: 'bg-green-500/20 text-green-600 dark:text-green-400',
        icon: CheckCircle2,
      },
      failed: {
        bg: 'bg-red-500/20 text-red-600 dark:text-red-400',
        icon: XCircle,
      },
    }

    const entry = map[s] ?? map['queued']
    const Icon = entry.icon

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${entry.bg}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {s}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Link href="/experiments">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Job Queue
        </h1>
        <p className="text-sm text-light-text/60 dark:text-dark-subtext">
          Active and queued jobs for all experiments
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext" />
          <input
            type="text"
            placeholder="Search by job ID or experiment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text"
          />
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">Experiment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">Phase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text/60 dark:text-dark-subtext uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {loadingQueue ? (
                <JobTableSkeleton />
              ) : filteredJobs.map((job, i) => (
                <motion.tr
                  key={job.job_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">{job.experiment_name}</td>
                  <td className="px-6 py-4 text-sm">{job.phase}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(job.created_at)}</td>
                  <td className="px-6 py-4 text-sm">{job.position}</td>
                  <td className="px-6 py-4">{getStatusBadge(job)}</td>

                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    {/* Logs button (only when running) */}
                    {job.running && (
                        <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => openLogs(job)}
                        disabled={loadingLogsJobId === job.job_id}
                        aria-label={loadingLogsJobId === job.job_id ? `Loading logs for ${job.experiment_name}` : `View logs for ${job.experiment_name}`}
                        >
                        {loadingLogsJobId === job.job_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        )}
                        </Button>
                    )}

                    {/* Cancel job button (queued or running) */}
                    {(job.status === 'queued' || job.running) && (
                        <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500 hover:text-red-600"
                        onClick={() => cancelJob(job)}
                        disabled={cancelingJobId === job.job_id}
                        aria-label={cancelingJobId === job.job_id ? `Canceling ${job.experiment_name}` : `Cancel ${job.experiment_name}`}
                        >
                        {cancelingJobId === job.job_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                        )}
                        </Button>
                    )}
                  </td>

                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loadingQueue && filteredJobs.length === 0 && (
          <div role="status" aria-live="polite" className="text-center py-12 text-light-text/60 dark:text-dark-subtext">
            No jobs found
          </div>
        )}
      </motion.div>

      {/* Logs Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-light-surface dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-light-border dark:border-dark-border">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                Job Logs:
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)} aria-label="Close logs">
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="text-xs font-mono text-light-text/80 dark:text-dark-subtext whitespace-pre-wrap">
                {logs}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
