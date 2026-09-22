'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, FileText, CheckCircle2, Clock, PlayCircle, XCircle, Loader2, ListChecks, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { apiFetch, ApiError } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useJobPolling } from '@/hooks/useJobPolling'

interface JobStatusBadgeEntry {
  variant: BadgeVariant
  pulse: boolean
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

// Statuses the backend allows history deletion for (see the status strings
// handled in getStatusBadge below; 'stopped' is RQ's status after a
// kill-horse cancel of a running job).
const TERMINAL_JOB_STATUSES = ['finished', 'failed', 'canceled', 'cancelled', 'stopped']

const isTerminalJob = (job: JobItem) =>
  !job.running && TERMINAL_JOB_STATUSES.includes(job.status)

function JobTableSkeleton() {
  return (
    <>
      <tr role="status" aria-live="polite">
        <td colSpan={6} className="sr-only">Loading jobs…</td>
      </tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-36" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
          <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
          <td className="px-6 py-4"><Skeleton className="h-8 w-16" /></td>
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
  const [jobPendingDelete, setJobPendingDelete] = useState<JobItem | null>(null)
  const [deletingJob, setDeletingJob] = useState(false)

  // Fetch queue items on mount & poll every 5s (pauses while the tab is hidden)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchJobs = async (isFirst: boolean) => {
    if (isFirst) {
      setLoadingQueue(true)
      setLoadError(null)
    }
    try {
      const data = await apiFetch('/jobs') as JobItem[]
      if (isMountedRef.current) {
        setJobs(data)
        setLoadError(null)
      }
    } catch (err) {
      if (isFirst) {
        console.error(err)
        if (isMountedRef.current) {
          setLoadError(getApiErrorMessage(err, 'Failed to load job queue'))
          setJobs([])
        }
      }
      // poll failures are silently ignored
    } finally {
      if (isFirst && isMountedRef.current) setLoadingQueue(false)
    }
  }

  useEffect(() => {
    fetchJobs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useJobPolling(() => fetchJobs(false), { intervalMs: 5000 })

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
      if (err instanceof ApiError && err.status === 404) {
        setLogs('No logs available yet.')
        setSelectedJob(job)
        return
      }
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

  const deleteJob = async () => {
    if (!jobPendingDelete || deletingJob) return
    const job = jobPendingDelete
    setDeletingJob(true)
    try {
      await apiFetch(`/jobs/${job.job_id}`, { method: 'DELETE' })
      // Drop the row locally — the backend no longer returns it, so the
      // next poll stays consistent without a full reload.
      setJobs((prev) => prev.filter((j) => j.job_id !== job.job_id))
      setJobPendingDelete(null)
      toast.success(`Job for ${job.experiment_name} removed from history`)
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to delete job'), { id: 'job-delete' })
    } finally {
      setDeletingJob(false)
    }
  }

  const getStatusBadge = (job: JobItem) => {
    const { status, running } = job
    const s = running ? 'started' : status

    const map: Record<string, JobStatusBadgeEntry> = {
      queued: { variant: 'warning', pulse: false, icon: Clock },
      started: { variant: 'info', pulse: true, icon: PlayCircle },
      finished: { variant: 'success', pulse: false, icon: CheckCircle2 },
      failed: { variant: 'error', pulse: false, icon: XCircle },
      canceled: { variant: 'neutral', pulse: false, icon: XCircle },
      cancelled: { variant: 'neutral', pulse: false, icon: XCircle },
    }

    const entry = map[s] ?? map['queued']
    const Icon = entry.icon

    return (
      <Badge variant={entry.variant} pulse={entry.pulse}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {s}
      </Badge>
    )
  }

  // Live summary announced to screen readers on every poll update
  const jobSummary = useMemo(() => {
    if (loadingQueue) return ''
    const running = jobs.filter(j => j.running).length
    const queued = jobs.filter(j => !j.running && j.status === 'queued').length
    const finished = jobs.filter(j => j.status === 'finished').length
    const failed = jobs.filter(j => j.status === 'failed').length
    return `${jobs.length} jobs — ${running} running, ${queued} queued, ${finished} finished, ${failed} failed`
  }, [jobs, loadingQueue])

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text/40 dark:text-dark-subtext" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by job ID or experiment..."
            aria-label="Search by job ID or experiment"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-btn border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text placeholder:text-light-text/40 dark:placeholder:text-dark-subtext focus:outline-none focus:ring-2 focus:ring-vt-maroon/50"
          />
        </div>
      </motion.div>

      {/* Screen-reader summary of queue state, refreshed by polling */}
      <div role="status" aria-live="polite" className="sr-only">
        {jobSummary}
      </div>

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
                    {/* Logs button — available for any job that has started
                        (running, finished, failed, canceled). Queued jobs
                        haven't produced logs yet so we hide it there. */}
                    {job.status !== 'queued' && (
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

                    {/* Delete-from-history button (terminal statuses only —
                        queued/running jobs must be canceled first) */}
                    {isTerminalJob(job) && (
                        <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500 hover:text-red-600"
                        onClick={() => setJobPendingDelete(job)}
                        aria-label={`Delete job for ${job.experiment_name} from history`}
                        >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    )}
                  </td>

                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loadingQueue && loadError && (
          <ErrorState
            title="Failed to load job queue"
            message={loadError}
            onRetry={() => void fetchJobs(true)}
          />
        )}

        {!loadingQueue && !loadError && filteredJobs.length === 0 && (
          jobs.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No jobs yet"
              description="Jobs appear here when you run a simulation phase or generate a visualization."
            />
          ) : (
            <EmptyState
              icon={Search}
              title="No jobs match your search"
              description="Try a different job ID or experiment name."
              action={
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              }
            />
          )
        )}
      </motion.div>

      {/* Delete-from-history confirmation */}
      <ConfirmDialog
        isOpen={jobPendingDelete !== null}
        title="Delete job from history"
        message={`Permanently remove this ${jobPendingDelete?.status ?? ''} job for "${jobPendingDelete?.experiment_name ?? ''}" from the job list? This cannot be undone.`}
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting…"
        cancelLabel="Cancel"
        variant="danger"
        isConfirming={deletingJob}
        onConfirm={deleteJob}
        onCancel={() => setJobPendingDelete(null)}
      />

      {/* Logs Modal */}
      <Dialog open={selectedJob !== null} onClose={() => setSelectedJob(null)} className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="border-b border-light-border dark:border-dark-border">
          <DialogTitle>
            Job Logs{selectedJob ? `: ${selectedJob.experiment_name}` : ''}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="overflow-y-auto flex-1 pt-4">
          <pre className="text-xs font-mono text-light-text/80 dark:text-dark-subtext whitespace-pre-wrap">
            {logs}
          </pre>
        </DialogBody>
      </Dialog>
    </div>
  )
}
