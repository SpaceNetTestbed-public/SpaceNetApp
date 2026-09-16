'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { apiFetch, API_URL, ApiError } from '@/lib/api'
import { SatConfig } from '@/types/experiment-config'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { useJobPolling } from '@/hooks/useJobPolling'
import { PhaseCard } from '@/components/experiment/PhaseCard'
import { VisualizationPanel } from '@/components/experiment/VisualizationPanel'
import { LogsModal } from '@/components/experiment/LogsModal'
import { GifModal } from '@/components/experiment/GifModal'

const SHELL_COLORS = ['green', 'red', 'blue', 'orange', 'purple', 'cyan', 'yellow', 'pink', 'white', 'gray']

interface PhaseStartResponse {
  job_id?: string
}

interface PhaseProgress {
  /** Human-readable step label derived from the log stream */
  step: string
  /** Wall-clock timestamp (ms since epoch) when this phase started */
  startedAt: number
  /** Last non-empty line from the simulator's stdout (truncated by UI) */
  lastLine: string
  /** Last N non-empty stdout lines, oldest → newest, for the expandable console */
  logTail: string[]
  /** Estimated completion 0–100 (from tqdm or pipeline milestones) */
  percent: number
  /** Optional sub-label, e.g. "2 / 3 timesteps" */
  detail?: string
}

// How many trailing log lines to keep for the expandable "live log" console.
const LOG_TAIL_LINES = 15
const MAX_MISSED_POLLS = 10 // 10 successful lookups at 3s intervals: about 30s
const MAX_POLL_REQUEST_FAILURES = 5
const POLL_REQUEST_TIMEOUT_MS = 30000

async function fetchPollingJson<T>(endpoint: string): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // Race the entire request, including JSON parsing, against the deadline.
    return await Promise.race([
      apiFetch(endpoint, { signal: controller.signal }) as Promise<T>,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error('Polling request timed out'))
        }, POLL_REQUEST_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// Map Phase 1 / Phase 2 stdout markers to a friendly step label.
// Order matters — checks are run top-to-bottom, later matches win, so the
// list reflects the pipeline order.
function derivePhaseStep(logs: string, phase: 1 | 2): string {
  if (!logs) return 'Starting…'
  const PHASE_1_MARKERS: Array<[string, string]> = [
    ['Generating Constellation TLEs', 'Generating satellite orbits'],
    ['Phase-0: Configuration Set-up', 'Configuring simulation'],
    ['Phase-1: ', 'Computing satellite positions'],
    ['Phase-2: Building topology', 'Building network topology (slowest step)'],
    ['Phase-3: ', 'Computing routing tables'],
    ['Phase-4: ', 'Computing optimal paths'],
    ['Phase_1 finished', 'Packaging output'],
  ]
  const PHASE_2_MARKERS: Array<[string, string]> = [
    ['Running', 'Running network simulation'],
    ['finished', 'Finalizing'],
  ]
  const markers = phase === 1 ? PHASE_1_MARKERS : PHASE_2_MARKERS
  let label = 'Starting…'
  for (const [needle, friendly] of markers) {
    if (logs.includes(needle)) label = friendly
  }
  return label
}

function extractLastLine(logs: string): string {
  if (!logs) return ''
  const lines = logs.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (trimmed.length > 0) return trimmed
  }
  return ''
}

function extractLogTail(logs: string, count: number): string[] {
  if (!logs) return []
  return logs
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
    .slice(-count)
}

/** Estimate how far through a phase run we are (0–100). */
function derivePhasePercent(logs: string, phase: 1 | 2): { percent: number; detail?: string } {
  if (!logs) return { percent: 2 }

  // tqdm-style progress from the simulator, e.g. "| 1/3 [" or "33%|"
  const stepMatches = [...logs.matchAll(/\|\s*(\d+)\/(\d+)\s*\[/g)]
  const lastStep = stepMatches.at(-1)
  if (lastStep) {
    const current = Number(lastStep[1])
    const total = Number(lastStep[2])
    if (total > 0) {
      const stepPct = Math.round((current / total) * 100)
      const detail = `${current} / ${total} timesteps`
      // During Phase-2 topology building, map timestep progress into 30–85%
      if (phase === 1 && logs.includes('Phase-2: Building topology')) {
        return { percent: 30 + Math.round((stepPct / 100) * 55), detail }
      }
      return { percent: stepPct, detail }
    }
  }

  const pctMatches = [...logs.matchAll(/(\d+)%\|/g)]
  const lastPct = pctMatches.at(-1)
  if (lastPct) {
    const pct = Number(lastPct[1])
    if (phase === 1 && logs.includes('Phase-2: Building topology')) {
      return { percent: 30 + Math.round((pct / 100) * 55) }
    }
    return { percent: pct }
  }

  const PHASE_1_MILESTONES: Array<[string, number]> = [
    ['Generating Constellation TLEs', 8],
    ['Phase-0: Configuration Set-up', 15],
    ['Phase-1: ', 28],
    ['Phase-2: Building topology', 35],
    ['Phase-3: ', 78],
    ['Phase-4: ', 88],
    ['Phase_1 finished', 96],
    ['Folder zipped', 100],
  ]
  const PHASE_2_MILESTONES: Array<[string, number]> = [
    ['Running phase_2', 15],
    ['Running', 40],
    ['finished with code 0', 95],
  ]
  const milestones = phase === 1 ? PHASE_1_MILESTONES : PHASE_2_MILESTONES
  let percent = 5
  for (const [needle, value] of milestones) {
    if (logs.includes(needle)) percent = value
  }
  return { percent }
}

export default function SimulationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const gifUrlRef = useRef<string | null>(null)
  const gifFetchVersionRef = useRef(0)
  const [loadingGif, setLoadingGif] = useState(true) // true until we check
  const [showGif, setShowGif] = useState(false)


  /* ----------------------------- Status States ----------------------------- */
  const [hasPhase1, setHasPhase1] = useState(false)
  const [hasPhase2, setHasPhase2] = useState(false)
  const [hasMN, setHasMN] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  /* Announced to screen readers while phases / GIF generation are polling */
  const [liveMessage, setLiveMessage] = useState('')

  /* ----------------------------- Output ----------------------------- */
  const [hasOutput, setHasOutput] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [outputChecked, setOutputChecked] = useState(false)
  const [timeSteps, setTimeSteps] = useState<number[]>([])
  const [timeStepIndex, setTimeStepIndex] = useState(0)
  const [shellNames, setShellNames] = useState<string[]>([])
  const [shellColors, setShellColors] = useState<Record<string, string>>({})
  // Phase runs and globe/GIF generation are independent pipelines — track
  // them separately so a rendering globe never disables the Run Phase buttons.
  const [isPhaseSubmitting, setIsPhaseSubmitting] = useState(false)
  const [isVizGenerating, setIsVizGenerating] = useState(false)

  /* ----------------------------- Phase Polling ----------------------------- */
  const [pollingPhase, setPollingPhase] = useState<1 | 2 | null>(null)
  const trackedJobIdRef = useRef<string | null>(null)
  const phasePollInFlightRef = useRef<string | null>(null)
  // An override can leave the previous output in place until its worker starts.
  // Only accept artifact-based completion after output was known to be absent.
  const phase1OutputAbsentRef = useRef(false)
  // If the /jobs response stops returning our tracked job for
  // MAX_MISSED_POLLS in a row, we assume Redis lost it (worker crash,
  // Redis restart, TTL expiry) and surface an error instead of spinning
  // forever. This does NOT fire during a legitimately long-running phase —
  // the counter resets to 0 on every poll where the job is found.
  const missedPollsRef = useRef(0)

  // Live progress info shown inside the running PhaseCard. Populated from the
  // /jobs/<id>/logs endpoint on every poll. Null when no phase is running.
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgress | null>(null)

  /* ----------------------------- GIF Polling ----------------------------- */
  const [isGifPolling, setIsGifPolling] = useState(false)
  const [vizError, setVizError] = useState<string | null>(null)
  /** Prevents double auto-launch of the globe renderer on mount + phase complete */
  const vizAutoTriggeredRef = useRef(false)
  /** RQ job id of the in-flight globe render, used by the viz Cancel button */
  const gifJobIdRef = useRef<string | null>(null)
  const vizInFlightRef = useRef(false)
  const gifPollInFlightRef = useRef<string | null>(null)
  const gifMissedPollsRef = useRef(0)
  const gifRequestFailuresRef = useRef(0)
  /** RQ job id of the in-flight animated GIF render */
  const animatedGifJobIdRef = useRef<string | null>(null)
  const animatedGifPollInFlightRef = useRef<string | null>(null)
  const animatedGifRequestFailuresRef = useRef(0)
  const [animatedGifError, setAnimatedGifError] = useState<string | null>(null)
  const [isAnimatedGifPolling, setIsAnimatedGifPolling] = useState(false)
  const triggerVisualizationRef = useRef<(auto?: boolean) => void>(() => {})

  /* ----------------------------- Logs ----------------------------- */
  const [showLogs, setShowLogs] = useState(false)
  const [logPhase, setLogPhase] = useState<1|2|null>(null)
  const [logs, setLogs] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  /* ----------------------------- Phase Override Confirm ----------------------------- */
  const [phaseOverrideConfirm, setPhaseOverrideConfirm] = useState<1|2|null>(null)

  /* ----------------------------- Polling helpers ----------------------------- */
  const stopPolling = () => {
    setPollingPhase(null)
    missedPollsRef.current = 0
    trackedJobIdRef.current = null
    setPhaseProgress(null)
  }

  const startPhasePolling = (phase: 1 | 2, startedAt: number = Date.now(), outputWasAbsent = false) => {
    setPollingPhase(phase)
    missedPollsRef.current = 0
    phase1OutputAbsentRef.current = outputWasAbsent
    setPhaseProgress({ step: 'Starting…', startedAt, lastLine: '', logTail: [], percent: 2 })
    setLiveMessage(`Phase ${phase} running`)
  }

  const pollPhaseTick = async () => {
    const currentPhase = pollingPhase
    if (!currentPhase) return
    const jobId = trackedJobIdRef.current
    if (!jobId || phasePollInFlightRef.current === jobId) return
    phasePollInFlightRef.current = jobId
    try {
      // Reconcile durable output independently of Redis job history, including
      // when /jobs fails. The shared polling hook also runs this on tab return.
      const [jobsResult, outputResult] = await Promise.allSettled([
        apiFetch('/jobs') as Promise<Array<{ job_id: string; status: string }>>,
        currentPhase === 1
          ? apiFetch(`/experiments/${id}/has-phase-1`) as Promise<{ data: boolean }>
          : Promise.resolve(null),
      ])
      if (trackedJobIdRef.current !== jobId) return
      const job = jobsResult.status === 'fulfilled'
        ? jobsResult.value.find(j => j.job_id === jobId)
        : undefined
      const output = outputResult.status === 'fulfilled' ? outputResult.value : null
      if (output?.data === false) phase1OutputAbsentRef.current = true
      const outputReady = output?.data === true && phase1OutputAbsentRef.current &&
        job?.status !== 'queued' && job?.status !== 'failed' &&
        job?.status !== 'stopped' && job?.status !== 'canceled' && job?.status !== 'cancelled'

      if (job?.status === 'finished' || outputReady) {
        stopPolling()
        setLiveMessage(`Phase ${currentPhase} complete`)
        toast.success(`Phase ${currentPhase} complete`)
        await checkStatus()
        if (currentPhase === 1) {
          vizAutoTriggeredRef.current = false
          triggerVisualizationRef.current(true)
          void queueAnimatedGif()
        }
        return
      }
      // Network errors aren't evidence that a job is missing.
      if (jobsResult.status === 'rejected') return
      if (!job) {
        missedPollsRef.current += 1
        if (missedPollsRef.current >= MAX_MISSED_POLLS) {
          stopPolling()
          setLiveMessage(`Phase ${currentPhase} status unavailable`)
          toast.error(
            `Phase ${currentPhase} status is no longer available. It may still be running — check the Jobs page.`,
            { id: `experiment-phase-status-unavailable-${currentPhase}` },
          )
        }
        return
      }
      missedPollsRef.current = 0
      if (job.status === 'failed' || job.status === 'stopped') {
        stopPolling()
        setLiveMessage(`Phase ${currentPhase} failed`)
        toast.error(`Phase ${currentPhase} failed — check the Jobs page for logs`)
      } else if (job.status === 'canceled' || job.status === 'cancelled') {
        // RQ returns 'canceled' (US); keep 'cancelled' too so older
        // deployments or manual status writes still resolve cleanly.
        stopPolling()
        setLiveMessage(`Phase ${currentPhase} cancelled`)
        toast.info(`Phase ${currentPhase} was cancelled`)
      } else if (job.status === 'queued') {
        setPhaseProgress((prev) => ({
          step: 'Waiting in job queue…',
          startedAt: prev?.startedAt ?? Date.now(),
          lastLine: '',
          logTail: [],
          percent: prev?.percent ?? 2,
          detail: 'Waiting for worker',
        }))
      } else if (job.status === 'started') {
        // While the job is actively running, fetch its live log stream
        // (backend reads job.meta from Redis, updated every stdout line).
        // Failure here is non-fatal — the phase card will just keep the
        // previous progress info until the next tick succeeds.
        try {
          const logRes = await apiFetch(`/jobs/${jobId}/logs`) as { logs?: string }
          if (trackedJobIdRef.current !== jobId) return
          const logs = logRes.logs || ''
          const { percent, detail } = derivePhasePercent(logs, currentPhase)
          setPhaseProgress((prev) => ({
            step: derivePhaseStep(logs, currentPhase),
            startedAt: prev?.startedAt ?? Date.now(),
            lastLine: extractLastLine(logs),
            logTail: extractLogTail(logs, LOG_TAIL_LINES),
            percent,
            detail,
          }))
        } catch {
          // Job just started or meta hasn't been written yet — leave the
          // existing progress state alone.
        }
      }
    } catch {
      // Transient poll failures (network hiccup, backend restart) don't
      // count toward the missed-poll safety net — only a job that's
      // consistently absent from a successful /jobs response does.
    } finally {
      if (phasePollInFlightRef.current === jobId) phasePollInFlightRef.current = null
    }
  }

  useJobPolling(pollPhaseTick, { intervalMs: 3000, enabled: pollingPhase !== null })

  const gifPollTick = async () => {
    const jobId = gifJobIdRef.current
    if (!jobId || gifPollInFlightRef.current === jobId) return
    gifPollInFlightRef.current = jobId
    try {
      const jobs = await fetchPollingJson<Array<{ job_id: string; status: string }>>('/jobs')
      if (gifJobIdRef.current !== jobId) return
      gifRequestFailuresRef.current = 0
      const job = jobs.find(j => j.job_id === jobId)
      if (!job) {
        gifMissedPollsRef.current += 1
        if (gifMissedPollsRef.current >= MAX_MISSED_POLLS) {
          vizAutoTriggeredRef.current = true
          vizInFlightRef.current = false
          gifJobIdRef.current = null
          setIsGifPolling(false)
          setIsVizGenerating(false)
          setOutputChecked(true)
          setVizError('Could not find the visualization job — it may have expired. Try running the visualization again.')
          setLiveMessage('Visualization job unavailable')
        }
        return
      }
      gifMissedPollsRef.current = 0
      if (job.status === 'finished') {
        vizInFlightRef.current = false
        setIsGifPolling(false)
        setIsVizGenerating(false)
        gifJobIdRef.current = null
        setVizError(null)
        setLiveMessage('Visualization ready')
        await fetchOutput()
        return
      }
      if (job.status === 'failed' || job.status === 'stopped') {
        vizInFlightRef.current = false
        vizAutoTriggeredRef.current = true
        setIsGifPolling(false)
        setIsVizGenerating(false)
        gifJobIdRef.current = null
        setOutputChecked(true)
        let message = 'GIF-generation job failed while rendering the visualization. Check the Jobs page for logs.'
        setVizError(message)
        setLiveMessage('GIF-generation job failed')
        try {
          const result = await fetchPollingJson<{ logs?: string }>(`/jobs/${jobId}/logs`)
          if (!vizInFlightRef.current && result.logs?.trim()) {
            message = `GIF-generation job failed while rendering the visualization: ${result.logs.trim()}`
            setVizError(message)
          }
        } catch {
          // Preserve the failure message if logs are unavailable.
        }
      } else if (job.status === 'canceled' || job.status === 'cancelled') {
        vizInFlightRef.current = false
        setIsGifPolling(false)
        vizAutoTriggeredRef.current = true
        setIsVizGenerating(false)
        gifJobIdRef.current = null
        setOutputChecked(true)
        setVizError('GIF-generation job was cancelled.')
        setLiveMessage('Visualization generation cancelled')
      }
    } catch {
      if (gifJobIdRef.current !== jobId) return
      gifRequestFailuresRef.current += 1
      if (gifRequestFailuresRef.current >= MAX_POLL_REQUEST_FAILURES) {
        vizAutoTriggeredRef.current = true
        vizInFlightRef.current = false
        gifJobIdRef.current = null
        setIsGifPolling(false)
        setIsVizGenerating(false)
        setOutputChecked(true)
        setVizError('Visualization status unavailable after repeated request failures. The job may still be running. Check the Jobs page.')
        setLiveMessage('Visualization status unavailable')
      }
    } finally {
      if (gifPollInFlightRef.current === jobId) gifPollInFlightRef.current = null
    }
  }

  useJobPolling(gifPollTick, { intervalMs: 3000, enabled: isGifPolling })

  const animatedGifPollTick = async () => {
    const jobId = animatedGifJobIdRef.current
    if (!jobId || animatedGifPollInFlightRef.current === jobId) return
    animatedGifPollInFlightRef.current = jobId

    try {
      const jobs = await fetchPollingJson<Array<{ job_id: string; status: string }>>('/jobs')
      if (animatedGifJobIdRef.current !== jobId) return
      animatedGifRequestFailuresRef.current = 0
      const job = jobs.find(j => j.job_id === jobId)
      if (!job) return

      if (job.status === 'finished') {
        animatedGifJobIdRef.current = null
        setIsAnimatedGifPolling(false)
        await fetchGif()
        setLiveMessage('Animated GIF ready')
        toast.success('Animated GIF ready')
      } else if (job.status === 'failed' || job.status === 'stopped') {
        animatedGifJobIdRef.current = null
        setIsAnimatedGifPolling(false)
        setAnimatedGifError('Animated GIF generation failed. Check the Jobs page for logs.')
        setLiveMessage('Animated GIF generation failed')
        toast.error('Animated GIF generation failed — check the Jobs page for logs')
      } else if (job.status === 'canceled' || job.status === 'cancelled') {
        animatedGifJobIdRef.current = null
        setIsAnimatedGifPolling(false)
        setLiveMessage('Animated GIF generation cancelled')
        toast.info('Animated GIF generation was cancelled')
      }
    } catch {
      if (animatedGifJobIdRef.current !== jobId) return
      animatedGifRequestFailuresRef.current += 1
      if (animatedGifRequestFailuresRef.current >= MAX_POLL_REQUEST_FAILURES) {
        animatedGifJobIdRef.current = null
        setIsAnimatedGifPolling(false)
        setAnimatedGifError('Animated GIF status unavailable after repeated request failures. The job may still be running. Check the Jobs page.')
        setLiveMessage('Animated GIF status unavailable')
      }
    } finally {
      if (animatedGifPollInFlightRef.current === jobId) animatedGifPollInFlightRef.current = null
    }
  }

  useJobPolling(animatedGifPollTick, { intervalMs: 3000, enabled: isAnimatedGifPolling })

  /* ----------------------------- Status Check ----------------------------- */
  const checkStatus = async () => {
    setStatusError(null)
    try {
      const [res1, res2] = await Promise.all([
        apiFetch(`/experiments/${id}/has-phase-1`) as Promise<{ data: boolean }>,
        apiFetch(`/experiments/${id}/has-phase-2`) as Promise<{ data: boolean }>
      ])
      setHasPhase1(res1.data === true)
      setHasPhase2(res2.data === true)
    } catch (err) {
      console.error('Failed to check status', err)
      setStatusError(getApiErrorMessage(err, 'Failed to check experiment status'))
    }
  }

  /* ---------------------- Resume polling after reload ---------------------- */
  // If the user reloads or navigates back to this page while a phase is still
  // queued/running on the backend, pick up polling again instead of showing a
  // stale "not running" state.
  const resumePollingIfActive = async () => {
    try {
      const jobs = await apiFetch('/jobs') as Array<{
        job_id: string
        experiment_id?: number | string | null
        phase?: string | null
        status: string
        created_at?: string | null
      }>
      const activeJob = jobs.find(j =>
        String(j.experiment_id) === String(id) &&
        (j.phase === '1' || j.phase === '2') &&
        (j.status === 'started' || j.status === 'queued')
      )
      if (activeJob?.phase === '1' || activeJob?.phase === '2') {
        const phase = Number(activeJob.phase) as 1 | 2
        trackedJobIdRef.current = activeJob.job_id
        // Prefer the job's server-side enqueued_at so the elapsed timer keeps
        // ticking correctly after a page reload. Fall back to now() if the
        // timestamp is missing / malformed.
        const parsedStart = activeJob.created_at
          ? Date.parse(activeJob.created_at)
          : NaN
        const startedAt = Number.isFinite(parsedStart) ? parsedStart : Date.now()
        startPhasePolling(phase, startedAt)
      }
    } catch {
      // A failed /jobs lookup on mount shouldn't block page load — the user
      // can still see phase status; polling just won't auto-resume.
    }
  }

  /* ----------------------------- SAT config ----------------------------- */
  useEffect(() => {
    const fetchSatConfig = async () => {
      try {
        const satConfig = await apiFetch(`/experiments/${id}/sat`) as SatConfig
        const count = satConfig.Sim_Length.TimeStepCount
        const duration = satConfig.Sim_Length.TimeStepDuration
        const steps: number[] = []
        for(let i=0;i<count;i++) steps.push(i*duration)
        setTimeSteps(steps)
        const names = Object.keys(satConfig.shells ?? {})
        setShellNames(names)
        const colors: Record<string,string> = {}
        names.forEach((name, idx) => {
          colors[name] = SHELL_COLORS[idx % SHELL_COLORS.length]
        })
        setShellColors(colors)
      } catch (err) {
        console.error('Failed to load SAT config', err)
        toast.error(getApiErrorMessage(err, 'Failed to load SAT config'), { id: 'experiment-sat-config-load' })
      }
    }
    fetchSatConfig()
    checkStatus()
    resumePollingIfActive()
  }, [id])

  useEffect(() => {
    const checkMainMN = async () => {
      try {
      const res = await fetch(`${API_URL}/experiments/${id}/main-mn`)
      if (!res.ok) {
        setHasMN(false)
      }
      } catch (err) {
        console.error('Failed to fetch main mn config', err)
        toast.error(getApiErrorMessage(err, 'Failed to load Main MN config'), { id: 'experiment-main-mn-config-load' })
      }
    }
    checkMainMN()
  }, [id])

  function replaceGifUrl(url: string | null) {
    if (gifUrlRef.current) URL.revokeObjectURL(gifUrlRef.current)
    gifUrlRef.current = url
    setGifUrl(url)
  }

  async function fetchGif() {
    const version = ++gifFetchVersionRef.current
    setLoadingGif(true)
    try {
      const res = await fetch(`${API_URL}/experiments/${id}/gifs/output-gif/file`)
      if (version !== gifFetchVersionRef.current) return
      if (!res.ok) {
        replaceGifUrl(null) // GIF doesn't exist yet
        return
      }
      const blob = await res.blob()
      if (version !== gifFetchVersionRef.current) return
      const url = URL.createObjectURL(blob)
      replaceGifUrl(url)
    } catch (err) {
      if (version !== gifFetchVersionRef.current) return
      console.error('Failed to fetch GIF:', err)
      toast.error(getApiErrorMessage(err, 'Failed to load visualization'), { id: 'experiment-gif-load' })
      replaceGifUrl(null)
    } finally {
      if (version === gifFetchVersionRef.current) setLoadingGif(false)
    }
  }

  useEffect(() => {
  
    fetchGif()
    return () => {
      gifFetchVersionRef.current += 1
      if (gifUrlRef.current) URL.revokeObjectURL(gifUrlRef.current)
      gifUrlRef.current = null
    }
  }, [id])

  /* ----------------------------- Fetch output ----------------------------- */
  const fetchOutput = async () => {
    setOutputChecked(false)
    try {
      const res = await fetch(`${API_URL}/experiments/${id}/gifs/output/file`)
      if(!res.ok) throw new Error('No output')
      const text = await res.text()
      setHtmlContent(text)
      setHasOutput(true)
    } catch {
      setHasOutput(false)
      setHtmlContent(null)
    } finally {
      setOutputChecked(true)
    }
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_URL}/experiments/${id}/gifs/output/output`)
      
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `experiment_${id}_output.zip` // or whatever filename you prefer
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to download the file.'), { id: 'experiment-output-download' })
    }
  }

  const downloadPhaseOutput = async (phase: 1 | 2) => {
    try {
      const endpoint =
        phase === 1
          ? `/experiments/${id}/download-output`
          : `/experiments/${id}/download-output-mn`

      const res = await fetch(`${API_URL}${endpoint}`)
  
      if (!res.ok) throw new Error('Download failed')
  
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
  
      const a = document.createElement('a')
      a.href = url
      a.download =
        phase === 1
          ? `experiment_${id}_phase1_output.zip`
          : `experiment_${id}_phase2_output.zip`
  
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error(getApiErrorMessage(err, `Failed to download Phase ${phase} output.`), { id: `experiment-phase-output-download-${phase}` })
    }
  }

  useEffect(() => { fetchOutput() }, [id])

  /* ----------------------------- Run visualization ----------------------------- */
  const triggerVisualization = useCallback(async (auto = false) => {
    if (vizInFlightRef.current || isVizGenerating || isGifPolling) return
    if (shellNames.length === 0 || timeSteps.length === 0) return

    if (auto) {
      if (vizAutoTriggeredRef.current) return
      vizAutoTriggeredRef.current = true
    }

    // React state disables the button on the next render; the ref closes the
    // same-render manual/automatic launch race before the first await.
    vizInFlightRef.current = true
    gifMissedPollsRef.current = 0
    gifRequestFailuresRef.current = 0
    setIsVizGenerating(true)
    setVizError(null)
    setHasOutput(false)
    setOutputChecked(false)
    setLiveMessage('Generating visualization')

    // If a globe job for this experiment is already queued or running
    // (auto-launch raced a manual click, or the page was reloaded mid-render),
    // attach to it instead of enqueuing a duplicate.
    try {
      const jobs = await apiFetch('/jobs') as Array<{
        job_id: string
        experiment_id?: number | string | null
        phase?: string | null
        gif_name?: string | null
        status: string
      }>
      // gif_name distinguishes the globe render ('output') from the animated
      // GIF job ('output-gif') that gets queued behind every Phase 1 run.
      const activeGifJob = jobs.find(j =>
        String(j.experiment_id) === String(id) &&
        j.phase === 'gif' &&
        j.gif_name === 'output' &&
        (j.status === 'queued' || j.status === 'started')
      )
      if (activeGifJob) {
        gifJobIdRef.current = activeGifJob.job_id
        setIsGifPolling(true)
        return
      }
    } catch {
      // /jobs being briefly unreachable shouldn't block the render — fall
      // through and let the create-gif POST surface any real error.
    }

    try {
      const result = await apiFetch(`/experiments/${id}/create-gif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gif_name: 'output',
          plot_GSs: true,
          make_gif: false,
          plot_in_3D: true,
          plot_debug: false,
          plot_only_optimal: false,
          plot_optimal_orbits: false,
          center_gif: false,
          time_step: timeSteps[timeStepIndex],
          lat: 0,
          long: 0,
          shells: shellColors,
        }),
      }) as PhaseStartResponse
      if (!result?.job_id) throw new Error('No visualization job ID was returned. Try running the visualization again.')
      gifJobIdRef.current = result.job_id
    } catch (err) {
      vizInFlightRef.current = false
      vizAutoTriggeredRef.current = true
      const message = getApiErrorMessage(err, 'Failed to generate visualization')
      setVizError(message)
      setIsVizGenerating(false)
      setOutputChecked(true)
      if (!auto) {
        toast.error(message, { id: 'experiment-output-generate' })
      }
      return
    }
    setIsGifPolling(true)
  }, [
    id,
    isGifPolling,
    isVizGenerating,
    shellColors,
    shellNames.length,
    timeStepIndex,
    timeSteps,
  ])

  triggerVisualizationRef.current = triggerVisualization

  // After Phase 1 output exists, auto-render the globe once config is loaded.
  useEffect(() => {
    if (!hasPhase1 || !outputChecked || hasOutput || isGifPolling || isVizGenerating) return
    if (shellNames.length === 0 || timeSteps.length === 0) return
    void triggerVisualization(true)
  }, [
    hasPhase1,
    outputChecked,
    hasOutput,
    isGifPolling,
    isVizGenerating,
    shellNames.length,
    timeSteps.length,
    triggerVisualization,
  ])

  const handleCreateGif = () => {
    vizAutoTriggeredRef.current = false
    void triggerVisualization(false)
  }

  const handleCreateAniGif = async () => {
    animatedGifRequestFailuresRef.current = 0
    setAnimatedGifError(null)
    try {
      setIsVizGenerating(true)
      const result = await apiFetch(`/experiments/${id}/create-gif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gif_name: 'output-gif',
          plot_GSs: true,
          make_gif: true,
          plot_in_3D: true,
          plot_debug: false,
          plot_only_optimal: false,
          plot_optimal_orbits: false,
          center_gif: true,
          time_step: 0,
          lat: 0,
          long: 0,
          shells: shellColors,
        }),
      }) as PhaseStartResponse
      animatedGifJobIdRef.current = result?.job_id ?? null
      if (animatedGifJobIdRef.current) {
        setIsAnimatedGifPolling(true)
        setLiveMessage('Generating animated GIF')
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to generate output'), { id: 'experiment-output-generate' })
    } finally {
      setIsVizGenerating(false)
    }
  }

  /* ----------------------------- Phase runs ----------------------------- */
  const runPhase = async (phase:1|2) => {
    const existing = phase === 1 ? hasPhase1 : hasPhase2
    if (existing) {
      setPhaseOverrideConfirm(phase)
      return
    }
    await executePhase(phase)
  }

  const executePhase = async (phase:1|2) => {
    setPhaseOverrideConfirm(null)
    if (phase === 1) {
      vizAutoTriggeredRef.current = false
      setVizError(null)
    }
    try{
      setIsPhaseSubmitting(true)
      const result = await apiFetch(`/experiments/${id}/phase-${phase}`, {method:'POST'}) as PhaseStartResponse
      if (phase === 1) {
        gifFetchVersionRef.current += 1
        replaceGifUrl(null)
        setLoadingGif(false)
        setShowGif(false)
        animatedGifJobIdRef.current = null
        setIsAnimatedGifPolling(false)
        setAnimatedGifError(null)
        setHasPhase1(false)
        setHasOutput(false)
        setHtmlContent(null)
      }
      trackedJobIdRef.current = result?.job_id ?? null
      toast.success(`Phase ${phase} started`)
      if (trackedJobIdRef.current) {
        startPhasePolling(phase, Date.now(), phase === 1 && !hasPhase1)
      } else {
        // Fallback if backend doesn't return job_id
        setTimeout(checkStatus, 3000)
      }
    }catch(err){
      console.error(err)
      toast.error(getApiErrorMessage(err, `Failed to start Phase ${phase}`), { id: `experiment-phase-start-${phase}` })
    }finally{
      setIsPhaseSubmitting(false)
    }

  }

  const queueAnimatedGif = async () => {
      animatedGifRequestFailuresRef.current = 0
      setAnimatedGifError(null)
      // Queue the animated GIF only after Phase 1 succeeds.
      // It's a nice-to-have — its failure must not read as a Phase 1 failure.
      try {
        const result = await apiFetch(`/experiments/${id}/create-gif`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gif_name: 'output-gif',
            plot_GSs: true,
            make_gif: true,
            plot_in_3D: true,
            plot_debug: false,
            plot_only_optimal: false,
            plot_optimal_orbits: false,
            center_gif: true,
            time_step: 0,
            lat: 0,
            long: 0,
            shells: shellColors,
          }),
        }) as PhaseStartResponse
        animatedGifJobIdRef.current = result?.job_id ?? null
        if (animatedGifJobIdRef.current) {
          setIsAnimatedGifPolling(true)
          setLiveMessage('Generating animated GIF')
        }
      } catch (err) {
        console.error('Failed to queue animated GIF job', err)
      }
  }

  /* ----------------------------- Cancel running phase ----------------------------- */
  const cancelActivePhase = async () => {
    const jobId = trackedJobIdRef.current
    if (!jobId || !pollingPhase) return
    try {
      await apiFetch(`/jobs/${jobId}/cancel`, { method: 'DELETE' })
      stopPolling()
      toast.success(`Phase ${pollingPhase} cancelled`)
      setLiveMessage(`Phase ${pollingPhase} cancelled`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to cancel job'), { id: 'experiment-phase-cancel' })
    }
  }

  /* ----------------------------- Cancel running visualization ----------------------------- */
  const cancelVisualization = async () => {
    const jobId = gifJobIdRef.current
    if (!jobId) return
    try {
      await apiFetch(`/jobs/${jobId}/cancel`, { method: 'DELETE' })
      if (gifJobIdRef.current !== jobId) return
      gifJobIdRef.current = null
      vizInFlightRef.current = false
      gifMissedPollsRef.current = 0
      setIsGifPolling(false)
      setIsVizGenerating(false)
      // Keep vizAutoTriggeredRef set so the auto-launch effect doesn't
      // immediately re-queue the job the user just cancelled.
      vizAutoTriggeredRef.current = true
      setOutputChecked(true)
      toast.info('Visualization cancelled')
      setLiveMessage('Visualization cancelled')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to cancel visualization'), { id: 'experiment-viz-cancel' })
    }
  }

  /* ----------------------------- Logs ----------------------------- */
  const openLogs = async (phase:1|2)=>{
    setShowLogs(true)
    setLogPhase(phase)
    setLoadingLogs(true)
    setLogs('')
    try{
      const res = await apiFetch(`/experiments/${id}/logs/${phase}`) as { logs: string }
      setLogs(res.logs || 'No logs available.')
    }catch(err){
      setLogs(err instanceof ApiError && err.status === 404
        ? 'No logs available yet.'
        : 'Failed to load logs.')
    }finally{
      setLoadingLogs(false)
    }
  }

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className="min-h-screen p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div>
        <Link href={`/experiments/${id}/edit`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true"/>
            Back to Experiments
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">Experiment Pipeline</h1>
      </div>

      {/* Announces phase / visualization polling transitions to screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {/* ==================== Phase 1 & Phase 2 ==================== */}
      {statusError ? (
        <ErrorState
          title="Failed to check experiment status"
          message={statusError}
          onRetry={() => void checkStatus()}
          className="border-b border-light-border dark:border-dark-border pb-8"
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-light-border dark:border-dark-border pb-8">
        <PhaseCard
          id={id}
          phase={1}
          hasOutput={hasPhase1}
          isSubmitting={isPhaseSubmitting}
          canRun={true}
          isPolling={pollingPhase === 1}
          progress={pollingPhase === 1 ? phaseProgress : null}
          onCancel={pollingPhase === 1 ? cancelActivePhase : undefined}
          onRun={() => runPhase(1)}
          onDownload={() => downloadPhaseOutput(1)}
          onLogs={() => openLogs(1)}
          onViewGif={() => setShowGif(true)}
          showGifButton={!loadingGif && !!gifUrl}
          hasMN={hasMN}
          onCreateAniGif={handleCreateAniGif}
        />
        <PhaseCard
          id={id}
          phase={2}
          hasOutput={hasPhase2}
          isSubmitting={isPhaseSubmitting}
          canRun={hasPhase1}
          isPolling={pollingPhase === 2}
          progress={pollingPhase === 2 ? phaseProgress : null}
          onCancel={pollingPhase === 2 ? cancelActivePhase : undefined}
          onRun={() => runPhase(2)}
          onDownload={() => downloadPhaseOutput(2)}
          onLogs={() => openLogs(2)}
          hasMN={hasMN}
        />
      </div>
      )}
      {/* ==================== Visualization + Controls ==================== */}
      {animatedGifError && (
        <ErrorState
          title="Animated GIF needs attention"
          message={animatedGifError}
          onRetry={() => router.push('/jobs')}
          retryLabel="Open Jobs"
        />
      )}
      {!hasPhase1 ? (
        <div role="status" className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-light-border dark:border-dark-border rounded-xl opacity-60">
          <Play className="h-12 w-12 text-light-text/30 dark:text-dark-subtext/50 mb-4" aria-hidden="true" />
          <p className="text-lg font-medium text-light-text/60 dark:text-dark-subtext text-center">
            Simulation will become available <br /> once Phase 1 output is generated.
          </p>
        </div>
      ) : (
        <VisualizationPanel
          hasOutput={hasOutput}
          outputChecked={outputChecked}
          htmlContent={htmlContent}
          timeSteps={timeSteps}
          timeStepIndex={timeStepIndex}
          onTimeStepChange={setTimeStepIndex}
          shellNames={shellNames}
          shellColors={shellColors}
          onShellColorChange={(shell, color) => setShellColors((prev) => ({ ...prev, [shell]: color }))}
          isSubmitting={isVizGenerating}
          isGenerating={isVizGenerating || isGifPolling}
          vizError={vizError}
          onCreateGif={handleCreateGif}
          onCancel={isGifPolling ? cancelVisualization : undefined}
          onDownload={handleDownload}
          shellColorOptions={SHELL_COLORS}
        />
      )}
      <LogsModal
        isOpen={showLogs}
        phase={logPhase}
        logs={logs}
        loading={loadingLogs}
        onClose={() => setShowLogs(false)}
      />
      <GifModal isOpen={showGif} gifUrl={gifUrl} onClose={() => setShowGif(false)} />

      <ConfirmDialog
        isOpen={phaseOverrideConfirm !== null}
        title="Override Existing Output"
        message={`Phase ${phaseOverrideConfirm} output already exists. Are you sure you want to override the old generation?`}
        confirmLabel="Override"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => phaseOverrideConfirm && executePhase(phaseOverrideConfirm)}
        onCancel={() => setPhaseOverrideConfirm(null)}
      />
    </div>
  )
}
