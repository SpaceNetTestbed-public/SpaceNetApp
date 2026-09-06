import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SimulationPage from '@/app/(app)/experiments/[id]/simulate/page'
import { apiFetch } from '@/lib/api'
import { useJobPolling } from '@/hooks/useJobPolling'

jest.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }), useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn(), API_URL: '/api', ApiError: class extends Error {} }))
jest.mock('@/hooks/useJobPolling', () => ({ useJobPolling: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const mockApi = jest.mocked(apiFetch)
let jobs: Array<{ job_id: string; status: string }> = []
let phase1 = true

beforeEach(() => {
  jest.clearAllMocks()
  jobs = []
  phase1 = true
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
    if (path.endsWith('/has-phase-2')) return { data: false }
    if (path.endsWith('/create-gif')) return { job_id: JSON.parse(options!.body as string).gif_name }
    if (path.endsWith('/phase-1')) return { job_id: 'phase1' }
    if (path.endsWith('/logs')) return { logs: 'FileNotFoundError: missing required TLE file' }
    throw new Error(`Unexpected API request: ${path}`)
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
