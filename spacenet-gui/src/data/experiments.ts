// Mock data for experiments
// TODO: Replace with API calls to Flask backend

export type OperatorType = 'Starlink' | 'OneWeb' | 'Amazon Kuiper' | 'Custom Operator' | 'Test Network'

export type ExperimentStatus = 'No Output' | 'Phase 1' | 'Phase 2'

export interface Experiment {
  id: string
  name: string
  operator: OperatorType
  description: string
  tags: string[]
  type: string
  hasPhase1: boolean;
  hasPhase2: boolean
  yamlFile: string
  modified: string // ISO date string
  status: ExperimentStatus
  createdAt: string
  group: string // Group name like "Starlink", "OneWeb"
}

export interface ExperimentGroup {
  name: string
  experiments: Experiment[]
}

export const mockExperiments: Experiment[] = [
  {
    id: '1',
    name: 'Starlink_1584',
    operator: 'Starlink',
    description: 'Starlink Gen2 constellation with 1584 satellites',
    tags: ['Phase 1', 'Production'],
    type: 'starlink',
    hasPhase1: true,
    hasPhase2: false,
    yamlFile: 'constellation_template.yaml',
    modified: '2025-01-15T00:00:00Z',
    status: 'Phase 1',
    createdAt: '2025-01-10T00:00:00Z',
    group: 'Starlink',
  },
  {
    id: '2',
    name: 'Starlink_Gen3_2400',
    operator: 'Starlink',
    description: 'Starlink Gen3 experimental deployment',
    tags: ['Phase 2', 'Experimental'],
    type: 'starlink',
    hasPhase1: true,
    hasPhase2: false,
    yamlFile: 'constellation_template.yaml',
    modified: '2025-01-14T00:00:00Z',
    status: 'Phase 1',
    createdAt: '2025-01-12T00:00:00Z',
    group: 'Starlink',
  },
  {
    id: '3',
    name: 'OneWeb_648',
    operator: 'OneWeb',
    description: 'OneWeb constellation with 648 satellites',
    tags: ['Phase 1', 'Production'],
    type: 'oneweb',
    hasPhase1: true,
    hasPhase2: false,
    yamlFile: 'constellation_template.yaml',
    modified: '2025-01-13T00:00:00Z',
    status: 'Phase 1',
    createdAt: '2025-01-08T00:00:00Z',
    group: 'OneWeb',
  },
  {
    id: '4',
    name: 'Kuiper_3236',
    operator: 'Amazon Kuiper',
    description: 'Project Kuiper full deployment',
    tags: ['Phase 2'],
    type: 'kuiper',
    hasPhase1: true,
    hasPhase2: true,
    yamlFile: 'constellation_template.yaml',
    modified: '2025-01-08T00:00:00Z',
    status: 'Phase 2',
    createdAt: '2025-01-05T00:00:00Z',
    group: 'Amazon Kuiper',
  },
  {
    id: '5',
    name: 'Kuiper_Shell_A_610',
    operator: 'Amazon Kuiper',
    description: 'Kuiper Shell A orbital configuration',
    tags: ['Phase 1'],
    type: 'kuiper',
    hasPhase1: true,
    hasPhase2: false,
    yamlFile: 'constellation_template.yaml',
    modified: '2025-01-06T00:00:00Z',
    status: 'Phase 1',
    createdAt: '2025-01-04T00:00:00Z',
    group: 'Amazon Kuiper',
  },
  {
    id: '6',
    name: 'Weather_Model_Test',
    operator: 'Custom Operator',
    description: 'Weather impact simulation',
    tags: ['Weather Modeling'],
    type: 'custom',
    hasPhase1: true,
    hasPhase2: false,
    yamlFile: 'main_config.yaml',
    modified: '2025-01-05T00:00:00Z',
    status: 'Phase 1',
    createdAt: '2025-01-03T00:00:00Z',
    group: 'Custom Operator',
  },
  {
    id: '7',
    name: 'Atmospheric_Drag_Study',
    operator: 'Custom Operator',
    description: 'LEO atmospheric drag analysis',
    tags: ['Weather Modeling'],
    type: 'custom',
    hasPhase1: true,
    hasPhase2: false,
    yamlFile: 'main_config.yaml',
    modified: '2025-01-03T00:00:00Z',
    status: 'Phase 1',
    createdAt: '2025-01-01T00:00:00Z',
    group: 'Custom Operator',
  },
]

export const getExperimentGroups = (experiments: Experiment[]): ExperimentGroup[] => {
  const groups = new Map<string, Experiment[]>()
  
  experiments.forEach(exp => {
    if (!groups.has(exp.group)) {
      groups.set(exp.group, [])
    }
    groups.get(exp.group)!.push(exp)
  })

  return Array.from(groups.entries()).map(([name, exps]) => ({
    name,
    experiments: exps.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()),
  }))
}

