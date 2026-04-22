// Mock data for simulation runs
// TODO: Replace with API calls to Flask backend

export type RunStatus = 'Completed' | 'Failed' | 'Running' | 'Pending'

export interface SimulationRun {
  id: string
  runId: string
  profileName: string
  profileId: string // Reference to experiment
  dateTime: string // ISO date string
  status: RunStatus
  duration: string // e.g., "2m 34s"
  durationSeconds: number // For sorting
  outputPath?: string
  errorMessage?: string
}

export const mockRuns: SimulationRun[] = [
  {
    id: '1',
    runId: 'run-001',
    profileName: 'Starlink_1584',
    profileId: '1',
    dateTime: '2025-11-01T14:32:15Z',
    status: 'Completed',
    duration: '2m 34s',
    durationSeconds: 154,
    outputPath: '/outputs/run-001',
  },
  {
    id: '2',
    runId: 'run-002',
    profileName: 'Starlink_Gen3_2400',
    profileId: '2',
    dateTime: '2025-11-01T13:18:42Z',
    status: 'Completed',
    duration: '3m 12s',
    durationSeconds: 192,
    outputPath: '/outputs/run-002',
  },
  {
    id: '3',
    runId: 'run-003',
    profileName: 'OneWeb_648',
    profileId: '3',
    dateTime: '2025-11-01T11:05:33Z',
    status: 'Completed',
    duration: '1m 48s',
    durationSeconds: 108,
    outputPath: '/outputs/run-003',
  },
  {
    id: '4',
    runId: 'run-004',
    profileName: 'Kuiper_3236',
    profileId: '4',
    dateTime: '2025-10-31T16:22:11Z',
    status: 'Failed',
    duration: '0m 42s',
    durationSeconds: 42,
    errorMessage: 'Simulation timeout',
  },
  {
    id: '5',
    runId: 'run-005',
    profileName: 'Weather_Model_Test',
    profileId: '5',
    dateTime: '2025-10-31T10:15:07Z',
    status: 'Completed',
    duration: '4m 05s',
    durationSeconds: 245,
    outputPath: '/outputs/run-005',
  },
]

