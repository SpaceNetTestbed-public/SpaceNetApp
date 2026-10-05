import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EditExperimentPage from '@/app/(app)/experiments/[id]/edit/page'
import { SatConfigForm } from '@/components/experiment-config/SatConfigForm'
import { apiFetch } from '@/lib/api'
import { defaultSatConfig, type SatConfig } from '@/types/experiment-config'
import type { TLEFile } from '@/types/types'

// jsdom lacks structuredClone, which the edit page uses to snapshot the
// loaded config. The configs here are plain JSON, so a JSON round-trip is
// an equivalent clone.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
}

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn(), API_URL: '/api', ApiError: class extends Error {} }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const mockApi = jest.mocked(apiFetch)

const satConfig: SatConfig = { ...defaultSatConfig, generate_TLE: true, tle_id: -1 }

beforeEach(() => {
  mockApi.mockReset()
  mockApi.mockImplementation(async (path) => {
    if (path === '/tles') return []
    if (path === '/experiments/1') {
      return { id: '1', name: 'baseline-test', description: '', tags: [], hasPhase1: true, hasPhase2: true }
    }
    if (path.endsWith('/sat')) return satConfig
    if (path.endsWith('/main-mn')) return { AppName: 'Ping' }
    if (path.endsWith('/main')) return {}
    return {}
  })
})

it('keeps the Generate Custom TLEs toggle enabled on an experiment that has been run', async () => {
  render(<EditExperimentPage />)

  // The "already been run" warning confirms hasBeenRun is true.
  expect(await screen.findByText('This experiment has already been run')).toBeInTheDocument()
  const toggle = screen.getByLabelText('Generate custom TLEs')
  expect(toggle).toBeEnabled()

  fireEvent.click(toggle)
  expect(toggle).not.toBeChecked()
})

it('clears a selected TLE file when generation is turned on', async () => {
  const tleFiles: TLEFile[] = [{ id: 3, name: 'uploaded-tles.txt', description: '' }]
  mockApi.mockImplementation(async (path) => (path === '/tles' ? tleFiles : {}))
  const onChange = jest.fn()
  render(
    <SatConfigForm config={{ ...satConfig, generate_TLE: false, tle_id: 3 }} onChange={onChange} />
  )

  // Wait for the /tles fetch to land so its state update happens inside act().
  expect(await screen.findByRole('option', { name: 'uploaded-tles.txt' })).toBeInTheDocument()

  const toggle = screen.getByLabelText('Generate custom TLEs')
  expect(toggle).toBeEnabled()
  fireEvent.click(toggle)

  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ generate_TLE: true, tle_id: -1 }))
})
