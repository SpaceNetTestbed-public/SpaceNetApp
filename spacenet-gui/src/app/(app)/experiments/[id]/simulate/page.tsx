'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { apiFetch, API_URL } from '@/lib/api'
import { SatConfig } from '@/types/experiment-config'
import { getApiErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { PhaseCard } from '@/components/experiment/PhaseCard'
import { VisualizationPanel } from '@/components/experiment/VisualizationPanel'
import { LogsModal } from '@/components/experiment/LogsModal'
import { GifModal } from '@/components/experiment/GifModal'

const SHELL_COLORS = ['green', 'red', 'blue', 'orange', 'purple', 'cyan', 'yellow', 'pink', 'white', 'gray']

interface PhaseStartResponse {
  job_id?: string
}

export default function SimulationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [loadingGif, setLoadingGif] = useState(true) // true until we check
  const [showGif, setShowGif] = useState(false)


  /* ----------------------------- Status States ----------------------------- */
  const [hasPhase1, setHasPhase1] = useState(false)
  const [hasPhase2, setHasPhase2] = useState(false)

  /* ----------------------------- Output ----------------------------- */
  const [hasOutput, setHasOutput] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [outputChecked, setOutputChecked] = useState(false)
  const [timeSteps, setTimeSteps] = useState<number[]>([])
  const [timeStepIndex, setTimeStepIndex] = useState(0)
  const [shellNames, setShellNames] = useState<string[]>([])
  const [shellColors, setShellColors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /* ----------------------------- Phase Polling ----------------------------- */
  const [pollingPhase, setPollingPhase] = useState<1 | 2 | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingPhaseRef = useRef<1 | 2 | null>(null)
  const trackedJobIdRef = useRef<string | null>(null)

  /* ----------------------------- Logs ----------------------------- */
  const [showLogs, setShowLogs] = useState(false)
  const [logPhase, setLogPhase] = useState<1|2|null>(null)
  const [logs, setLogs] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  /* ----------------------------- Phase Override Confirm ----------------------------- */
  const [phaseOverrideConfirm, setPhaseOverrideConfirm] = useState<1|2|null>(null)

  /* ----------------------------- Polling helpers ----------------------------- */
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    pollingPhaseRef.current = null
    setPollingPhase(null)
  }

  const startPhasePolling = (phase: 1 | 2) => {
    stopPolling()
    pollingPhaseRef.current = phase
    setPollingPhase(phase)

    pollingIntervalRef.current = setInterval(async () => {
      const currentPhase = pollingPhaseRef.current
      if (!currentPhase) return
      const jobId = trackedJobIdRef.current
      if (!jobId) return
      try {
        const jobs = await apiFetch('/jobs') as Array<{ job_id: string; status: string }>
        const job = jobs.find(j => j.job_id === jobId)
        if (!job) return
        if (job.status === 'finished') {
          stopPolling()
          toast.success(`Phase ${currentPhase} complete`)
          await checkStatus()
        } else if (job.status === 'failed') {
          stopPolling()
          toast.error(`Phase ${currentPhase} failed - check jobs page for logs`)
        }
      } catch {
        // poll failures are silently ignored
      }
    }, 5000)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

  /* ----------------------------- Status Check ----------------------------- */
  const checkStatus = async () => {
    try {
      const [res1, res2] = await Promise.all([
        apiFetch(`/experiments/${id}/has-phase-1`) as Promise<{ data: boolean }>,
        apiFetch(`/experiments/${id}/has-phase-2`) as Promise<{ data: boolean }>
      ])
      setHasPhase1(res1.data === true)
      setHasPhase2(res2.data === true)
    } catch (err) {
      console.error('Failed to check status', err)
      toast.error(getApiErrorMessage(err, 'Failed to check experiment status'), { id: 'experiment-check-status' })
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
        for(let i=0;i<=count;i++) steps.push(i*duration)
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
  }, [id])

  useEffect(() => {
    const fetchGif = async () => {
      setLoadingGif(true)
      try {
        const res = await fetch(`${API_URL}/experiments/${id}/gifs/output-gif/file`)
        if (!res.ok) {
          setGifUrl(null) // GIF doesn't exist yet
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setGifUrl(url)
      } catch (err) {
        console.error('Failed to fetch GIF:', err)
        toast.error(getApiErrorMessage(err, 'Failed to load visualization'), { id: 'experiment-gif-load' })
        setGifUrl(null)
      } finally {
        setLoadingGif(false)
      }
    }
  
    fetchGif()
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl)
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
  const handleCreateGif = async () => {
    try{
      setIsSubmitting(true)
      setHasOutput(false)
      setOutputChecked(false)
      await apiFetch(`/experiments/${id}/create-gif`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          gif_name:'output',
          plot_GSs:true,
          make_gif:false,
          plot_in_3D:true,
          plot_debug:false,
          plot_only_optimal:false,
          plot_optimal_orbits:false,
          center_gif:false,
          time_step: timeSteps[timeStepIndex],
          lat:0,
          long:0,
          shells: shellColors
        })
      })
      await new Promise(r=>setTimeout(r,6000))
      await fetchOutput()
    }catch(err){
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to generate output'), { id: 'experiment-output-generate' })
    }finally{
      setIsSubmitting(false)
    }
  }

  const handleCreateAniGif = async () => {
    try{
      setIsSubmitting(true)
      await apiFetch(`/experiments/${id}/create-gif`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          gif_name:'output-gif',
          plot_GSs:true,
          make_gif:true,
          plot_in_3D:true,
          plot_debug:false,
          plot_only_optimal:false,
          plot_optimal_orbits:false,
          center_gif:true,
          time_step: 0,
          lat:0,
          long:0,
          shells: {
            '0': 'green',
            '1': 'yellow',
            '2': 'blue'
          }
        })
      })
    }catch(err){
      console.error(err)
      toast.error(getApiErrorMessage(err, 'Failed to generate output'), { id: 'experiment-output-generate' })
    }finally{
      setIsSubmitting(false)
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
    try{
      setIsSubmitting(true)
      const result = await apiFetch(`/experiments/${id}/phase-${phase}`, {method:'POST'}) as PhaseStartResponse
      trackedJobIdRef.current = result?.job_id ?? null
      toast.success(`Phase ${phase} started`)
      if (trackedJobIdRef.current) {
        startPhasePolling(phase)
      } else {
        // Fallback if backend doesn't return job_id
        setTimeout(checkStatus, 3000)
      }
    }catch(err){
      console.error(err)
      toast.error(getApiErrorMessage(err, `Failed to start Phase ${phase}`), { id: `experiment-phase-start-${phase}` })
    }finally{
      setIsSubmitting(false)
    }

    if (phase === 1) {
      await apiFetch(`/experiments/${id}/create-gif`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          gif_name:'output-gif',
          plot_GSs:true,
          make_gif:true,
          plot_in_3D:true,
          plot_debug:false,
          plot_only_optimal:false,
          plot_optimal_orbits:false,
          center_gif:true,
          time_step: 0,
          lat:0,
          long:0,
          shells: {
            shell1: 'green',
            shell2: 'yellow',
            shell3: 'blue'
          }
        })
      })
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
    }catch{
      setLogs('Failed to load logs.')
    }finally{
      setLoadingLogs(false)
    }
  }

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className="min-h-screen p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div>
        <Link href="/experiments">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2"/>
            Back to Experiments
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Experiment Pipeline</h1>
      </div>
      {/* ==================== Phase 1 & Phase 2 ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
        <PhaseCard
          phase={1}
          hasOutput={hasPhase1}
          isSubmitting={isSubmitting}
          canRun={true}
          isPolling={pollingPhase === 1}
          onRun={() => runPhase(1)}
          onDownload={() => downloadPhaseOutput(1)}
          onLogs={() => openLogs(1)}
          onViewGif={() => setShowGif(true)}
          showGifButton={!loadingGif && !!gifUrl}
          onCreateAniGif={handleCreateAniGif}
        />
        <PhaseCard
          phase={2}
          hasOutput={hasPhase2}
          isSubmitting={isSubmitting}
          canRun={hasPhase1}
          isPolling={pollingPhase === 2}
          onRun={() => runPhase(2)}
          onDownload={() => downloadPhaseOutput(2)}
          onLogs={() => openLogs(2)}
        />
      </div>
      {/* ==================== Visualization + Controls ==================== */}
      {!hasPhase1 ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-60">
          <Play className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-500 text-center">
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
          isSubmitting={isSubmitting}
          onCreateGif={handleCreateGif}
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