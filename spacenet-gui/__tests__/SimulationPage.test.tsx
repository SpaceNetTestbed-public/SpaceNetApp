import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SimulationPage from '@/app/(app)/experiments/[id]/simulate/page'
import { apiFetch } from '@/lib/api'
import { useJobPolling } from '@/hooks/useJobPolling'
import { toast } from 'sonner'

jest.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }), useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn(), API_URL: '/api', ApiError: class extends Error {} }))
jest.mock('@/hooks/useJobPolling', () => ({ useJobPolling: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const mockApi = jest.mocked(apiFetch)
let jobs: Array<{ job_id: string; status: string }> = []
let phase1 = true
let phase2 = false

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(useJobPolling).mockReset()
  jobs = []
  phase1 = true
  phase2 = false
  URL.createObjectURL = jest.fn(() => 'blob:test')
  URL.revokeObjectURL = jest.fn()
  global.fetch = jest.fn(async (url) => ({
    ok: !String(url).includes('output-gif'),
    text: async () => '<html>output</html>',
    blob: async () => new Blob(['gif']),
  })) as jest.Mock
  mockApi.mockImplementation(async (path, options) => {
    if (path === '/jobs') return jobs
    if (path.endsWith('/sat')) return { Sim_Length: { TimeStepCount: 3, TimeStepDuration: 10 }, shells: { starlink: {} } }
    if (path.endsWith('/has-phase-1')) return { data: phase1 }
    if (path.endsWith('/has-phase-2')) return { data: phase2 }
    if (path.endsWith('/create-gif')) return { job_id: JSON.parse(options!.body as string).gif_name }
    if (path.endsWith('/phase-1')) return { job_id: 'phase1' }
    if (path.endsWith('/logs')) return { logs: 'FileNotFoundError: missing required TLE file' }
    throw new Error(`Unexpected API request: ${path}`)
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

async function startVisualization() {
  render(<SimulationPage />)
  await screen.findByTitle('Visualization output')
  fireEvent.click(screen.getByRole('button', { name: 'Run Visualization' }))
  await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/experiments/1/create-gif', expect.anything()))
}

it('ends visualization polling after ten missing lookups and allows a fresh retry', async () => {
  await startVisualization()
  for (let i = 0; i < 9; i++) await poll(1)
  expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
  await poll(1)
  expect(screen.getByText(/Could not find the visualization job/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Generating/ })).not.toBeInTheDocument()
  expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(1)

  fireEvent.click(screen.getByRole('button', { name: 'Retry visualization' }))
  await waitFor(() => expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(2))
  await poll(1) // The new job gets a fresh missing-job budget.
  expect(screen.queryByText(/Could not find the visualization job/)).not.toBeInTheDocument()
  jobs = [{ job_id: 'output', status: 'finished' }]
  await poll(1)
  expect(await screen.findByTitle('Visualization output')).toBeInTheDocument()
})

it('resets missing-job counts when found and never times out a tracked long visualization', async () => {
  await startVisualization()
  for (let i = 0; i < 9; i++) await poll(1)
  jobs = [{ job_id: 'output', status: 'started' }]
  for (let i = 0; i < 65; i++) await poll(1)
  jobs = []
  for (let i = 0; i < 9; i++) await poll(1)
  expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
  await poll(1)
  expect(screen.getByText(/Could not find the visualization job/)).toBeInTheDocument()
})

it('stops polling and shows an error after 5 consecutive request failures', async () => {
  await startVisualization()
  for (let i = 0; i < 4; i++) {
    mockApi.mockRejectedValueOnce(new Error('Network unavailable'))
    await poll(1)
  }

  expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
  expect(screen.queryByText('Visualization needs attention')).not.toBeInTheDocument()
  const callsAfterFourFailures = jest.mocked(useJobPolling).mock.calls
  expect(callsAfterFourFailures[callsAfterFourFailures.length - 2][1]?.enabled).toBe(true)

  mockApi.mockRejectedValueOnce(new Error('Network unavailable'))
  await poll(1)

  expect(screen.getByText(/Visualization status unavailable after repeated request failures/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Generating/ })).not.toBeInTheDocument()
  const callsAfterFiveFailures = jest.mocked(useJobPolling).mock.calls
  expect(callsAfterFiveFailures[callsAfterFiveFailures.length - 2][1]?.enabled).toBe(false)
})

it('guards two visualization launches in the same render while the preflight is pending', async () => {
  render(<SimulationPage />)
  await screen.findByTitle('Visualization output')
  const lookup = deferred<typeof jobs>()
  mockApi.mockImplementationOnce(() => lookup.promise)
  const button = screen.getByRole('button', { name: 'Run Visualization' })
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
  await act(async () => { lookup.resolve([]) })
  expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(1)
})

it('reports a missing job ID in the launch response and allows retry', async () => {
  const implementation = mockApi.getMockImplementation()!
  mockApi.mockImplementation(async (path, options) => path.endsWith('/create-gif') ? {} : implementation(path, options))
  await startVisualization()
  expect(await screen.findByText(/No visualization job ID was returned/)).toBeInTheDocument()
  mockApi.mockImplementation(implementation)
  fireEvent.click(screen.getByRole('button', { name: 'Retry visualization' }))
  await waitFor(() => expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(2))
  jobs = [{ job_id: 'output', status: 'finished' }]
  await poll(1)
  expect(await screen.findByTitle('Visualization output')).toBeInTheDocument()
})

it('ignores an old visualization poll arriving after cancellation and retry', async () => {
  await startVisualization()
  const lookup = deferred<typeof jobs>()
  mockApi.mockReturnValueOnce(lookup.promise)
  const calls = jest.mocked(useJobPolling).mock.calls
  const tick = calls[calls.length - 2][0]
  let pending!: void | Promise<void>
  act(() => { pending = tick() })
  const implementation = mockApi.getMockImplementation()!
  mockApi.mockImplementation(async (path, options) => {
    if (path.endsWith('/cancel')) return {}
    if (path.endsWith('/create-gif')) return { job_id: 'replacement' }
    return implementation(path, options)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel visualization' }))
  await screen.findAllByRole('button', { name: 'Run Visualization' })
  fireEvent.click(screen.getAllByRole('button', { name: 'Run Visualization' })[0])
  await waitFor(() => expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(2))
  await act(async () => {
    lookup.resolve([{ job_id: 'output', status: 'finished' }])
    await pending
  })
  expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
  jobs = [{ job_id: 'replacement', status: 'finished' }]
  await poll(1)
  expect(await screen.findByTitle('Visualization output')).toBeInTheDocument()
})

it('shows the override dialog before running Phase 1 when Phase 2 output exists but Phase 1 does not', async () => {
  phase1 = false
  phase2 = true
  render(<SimulationPage />)
  const runButton = await screen.findByRole('button', { name: 'Run Phase 1' })

  fireEvent.click(runButton)
  expect(await screen.findByText(
    'Phase 2 output already exists for this experiment. Running Phase 1 will discard it and start a fresh run. Are you sure you want to continue?'
  )).toBeInTheDocument()
  expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/phase-1'))).toHaveLength(0)

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText(/Running Phase 1 will discard it/)).not.toBeInTheDocument()
  expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/phase-1'))).toHaveLength(0)

  fireEvent.click(screen.getByRole('button', { name: 'Run Phase 1' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Override' }))
  await waitFor(() => expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/phase-1'))).toHaveLength(1))
})

it('names both phases in the override dialog when Phase 1 and Phase 2 output both exist', async () => {
  phase1 = true
  phase2 = true
  render(<SimulationPage />)
  const runButton = await screen.findByRole('button', { name: 'Run Phase 1' })

  fireEvent.click(runButton)
  expect(await screen.findByText(
    'Phase 1 and Phase 2 output already exist for this experiment. Running Phase 1 will discard it and start a fresh run. Are you sure you want to continue?'
  )).toBeInTheDocument()
})

it('names only Phase 1 in the override dialog when Phase 2 output does not exist', async () => {
  phase1 = true
  phase2 = false
  render(<SimulationPage />)
  const runButton = await screen.findByRole('button', { name: 'Run Phase 1' })

  fireEvent.click(runButton)
  expect(await screen.findByText(
    'Phase 1 output already exists for this experiment. Running Phase 1 will discard it and start a fresh run. Are you sure you want to continue?'
  )).toBeInTheDocument()
})

it('starts Phase 1 immediately with no dialog when neither phase has output', async () => {
  phase1 = false
  phase2 = false
  render(<SimulationPage />)
  const runButton = await screen.findByRole('button', { name: 'Run Phase 1' })

  fireEvent.click(runButton)
  await waitFor(() => expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/phase-1'))).toHaveLength(1))
  expect(screen.queryByText('Override Existing Output')).not.toBeInTheDocument()
})

describe('Phase 1 with the real polling hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    jest.mocked(useJobPolling).mockImplementation(jest.requireActual('@/hooks/useJobPolling').useJobPolling)
    phase1 = false
  })

  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  async function advance(milliseconds: number) {
    // Flush requests between ticks, just as separate browser timer tasks do.
    for (let remaining = milliseconds; remaining > 0; remaining -= 3000) {
      await act(async () => { jest.advanceTimersByTime(Math.min(remaining, 3000)) })
    }
  }

  async function startPhase() {
    render(<SimulationPage />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Run Phase 1' }))
    await act(async () => {})
    jobs = [{ job_id: 'phase1', status: 'started' }]
  }

  it.each(['finished', 'started', 'missing', 'network-error'])('recovers a 15-minute run when job status is %s at completion', async status => {
    await startPhase()
    const before = mockApi.mock.calls.filter(([path]) => path === '/jobs').length
    await advance(15 * 60 * 1000)
    expect(mockApi.mock.calls.filter(([path]) => path === '/jobs')).toHaveLength(before + 300)
    expect(screen.getByRole('button', { name: 'Phase 1 is running' })).toBeDisabled()
    phase1 = true
    jobs = status === 'missing' ? [] : [{ job_id: 'phase1', status }]
    if (status === 'network-error') {
      const implementation = mockApi.getMockImplementation()!
      mockApi.mockImplementation(async (path, options) => {
        if (path === '/jobs') throw new Error('Jobs unavailable')
        return implementation(path, options)
      })
    }
    await advance(3000)
    expect(screen.getByText('Output Ready')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Phase 1 is running' })).not.toBeInTheDocument()
    const animatedCalls = mockApi.mock.calls.filter(([path, options]) => path.endsWith('/create-gif') && JSON.parse(options!.body as string).make_gif)
    expect(animatedCalls).toHaveLength(1)
    await advance(9000)
    expect(toast.success).toHaveBeenCalledWith('Phase 1 complete')
    expect(jest.mocked(toast.success).mock.calls.filter(([message]) => message === 'Phase 1 complete')).toHaveLength(1)
  })

  it('reconciles immediately after returning from a hidden tab with expired job history', async () => {
    await startPhase()
    await advance(3000)
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    const before = mockApi.mock.calls.filter(([path]) => path === '/jobs').length
    await advance(15 * 60 * 1000)
    expect(mockApi.mock.calls.filter(([path]) => path === '/jobs')).toHaveLength(before)
    phase1 = true
    jobs = []
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.getByText('Output Ready')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Phase 1 is running' })).not.toBeInTheDocument()
  })

  it('does not accept old output from an override until it has been cleared', async () => {
    phase1 = true
    render(<SimulationPage />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Run Phase 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Override' }))
    await act(async () => {})
    jobs = [{ job_id: 'phase1', status: 'queued' }]
    await advance(30000)
    jobs = [{ job_id: 'phase1', status: 'started' }]
    await advance(3000)
    expect(screen.getByRole('button', { name: 'Phase 1 is running' })).toBeDisabled()
    phase1 = false
    await advance(3000)
    phase1 = true
    await advance(3000)
    expect(screen.getByText('Output Ready')).toBeInTheDocument()
  })

  it.each(['failed', 'stopped', 'canceled', 'cancelled'])('honors terminal status %s even when artifacts exist', async status => {
    await startPhase()
    await advance(3000)
    jobs = [{ job_id: 'phase1', status }]
    phase1 = true
    await advance(3000)
    expect(screen.queryByRole('button', { name: 'Phase 1 is running' })).not.toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalledWith('Phase 1 complete')
    expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(0)
  })
})

async function poll(index: number) {
  const calls = jest.mocked(useJobPolling).mock.calls
  const [tick, options] = calls[calls.length - 3 + index]
  expect(options?.enabled).toBe(true)
  await act(async () => { await tick() })
}

it('offers exactly TimeStepCount offsets and renders the last valid timestep', async () => {
  render(<SimulationPage />)
  const select = await screen.findByLabelText('Time Step')
  await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3))
  expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['t = 0s', 't = 10s', 't = 20s'])
  fireEvent.change(select, { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Run Visualization' }))
  await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/experiments/1/create-gif', expect.objectContaining({ body: expect.stringContaining('"time_step":20') })))
  jobs = [{ job_id: 'output', status: 'finished' }]
  await poll(1)
  expect(await screen.findByTitle('Visualization output')).toBeInTheDocument()
})

it('reports a failed globe job with its actual logs on the next poll', async () => {
  render(<SimulationPage />)
  await screen.findByTitle('Visualization output')
  fireEvent.click(screen.getByRole('button', { name: 'Run Visualization' }))
  await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/experiments/1/create-gif', expect.anything()))
  jobs = [{ job_id: 'output', status: 'failed' }]
  await poll(1)
  expect(await screen.findByText(/GIF-generation job failed while rendering the visualization: FileNotFoundError/)).toBeInTheDocument()
  expect(screen.queryByText(/re-run Phase 1/)).not.toBeInTheDocument()
})

it.each(['failed', 'canceled', 'finished'])('queues animated GIF only after Phase 1 success (%s)', async status => {
  phase1 = false
  render(<SimulationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Run Phase 1' }))
  await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/experiments/1/phase-1', expect.anything()))
  expect(mockApi.mock.calls.filter(([path]) => path.endsWith('/create-gif'))).toHaveLength(0)
  jobs = [{ job_id: 'phase1', status }]
  phase1 = status === 'finished'
  await poll(0)
  const animatedCalls = mockApi.mock.calls.filter(([path, options]) => path.endsWith('/create-gif') && JSON.parse(options!.body as string).make_gif)
  expect(animatedCalls).toHaveLength(status === 'finished' ? 1 : 0)
})

it('revokes the old GIF on rerun and displays the tracked replacement after completion', async () => {
  let blobNumber = 0
  URL.createObjectURL = jest.fn(() => `blob:render-${++blobNumber}`)
  global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<html>output</html>', blob: async () => new Blob(['gif']) })) as jest.Mock
  const { unmount } = render(<SimulationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'View GIF' }))
  const oldUrl = screen.getByAltText('Simulation GIF').getAttribute('src')
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.click(screen.getByRole('button', { name: 'Run Phase 1' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Override' }))
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldUrl))
  expect(screen.queryByRole('button', { name: 'View GIF' })).not.toBeInTheDocument()
  jobs = [{ job_id: 'phase1', status: 'finished' }]
  await poll(0)
  expect(await screen.findByRole('button', { name: 'Run GIF' })).toBeInTheDocument()
  jobs = [{ job_id: 'output-gif', status: 'finished' }]
  await poll(2)
  fireEvent.click(await screen.findByRole('button', { name: 'View GIF' }))
  const newUrl = screen.getByAltText('Simulation GIF').getAttribute('src')
  expect(newUrl).not.toBe(oldUrl)
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(newUrl)
})
