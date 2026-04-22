export interface Experiment {
  id: string
  name: string
  description?: string
  tags: string[]
  created_at?: string
  hasPhase1: boolean
  hasPhase2: boolean
}

export interface ExperimentGroup {
  name: string
  experiments: Experiment[]
}

/** Request body for creating or duplicating an experiment */
export interface CreateExperimentBody {
  name: string
  description?: string
  tags?: string[]
}

/** API response when creating or duplicating an experiment */
export interface CreateExperimentResponse {
  experiment_id: string
}

/** Ground station file list item (id + name) */
export interface GroundStationFileSummary {
  id: number
  name: string
}

/** Station entry for dropdowns (minimal shape from API) */
export interface StationOption {
  id: number
  name: string
  lat?: number
  lon?: number
}