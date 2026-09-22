// Type definitions for experiment configuration
// Maps to constellation_template.yaml and main_config.yaml structures

export interface SimLength {
  TimeStepDuration: number // seconds
  TimeStepCount: number
}

export interface SimDateTime {
  StartYear: number
  StartMonth: number
  StartDay: number
  StartHour: number
  StartMinute: number
  StartSecond: number
}

export interface ShellConfig {
  name: string
  orbits: number
  sat_per_orbit: number
  altitude: number // km
  inclination: number // degrees
  pattern: 'walker_delta' | 'walker_star' | 'ELFD'
  ipp_increment: number
  body: 'Earth' | 'Moon'
  perturber: 'Earth' | 'Moon' | 'None'
}

export interface SatConfig {
  Sim_Length: SimLength
  Sim_Date_Time: SimDateTime
  generate_TLE: boolean
  operator_name: 'starlink' | 'lunar'
  shells: ShellConfig[]
  tle_id: number
  TLEFilePath: string
}

export interface MainConfig {
  ConstellationName: string
  Debug: 0 | 1
  OutputFilePath: string
  MonitorResource: boolean
  SourceNode: number
  gs_file_id: number
  DestNode: number
  RouteWeight: 'hops' | 'latency' | 'distance' | 'capacity'
  GroundStationFile: string
  min_elevation_angle: number // degrees
  AssociationCritGSL: string
  UseWeatherData: boolean
  TopoCrit: 0 | 1 | 2 // 0 = ISL only, 1 = Terrestrial only, 2 = Both
  Gateways?: {
    t2t_gateway_kmz_type?: string
    t2t_gateway_kmz_path?: string
    t2t_dict_output_file?: string
  }
  Azure?: {
    t2t_use_azure: boolean
    t2t_azure_endpoint_location_file?: string
    t2t_azure_endpoint_latency_url?: string
    t2t_azure_dict_output_file?: string
  }
  WonderProxy?: {
    t2t_use_wonderproxy: boolean
    t2t_wonderproxy_endpoint_location_file?: string
    t2t_wonderproxy_endpoint_latency_file?: string
    t2t_wonderproxy_dict_output_file?: string
  }
}

export interface ExperimentConfig {
  // Profile metadata
  experimentName: string
  description: string
  tag?: string
  tags: string[]
  operatorType?: 'Starlink' | 'OneWeb' | 'Amazon Kuiper' | 'Custom Operator' | 'Test Network'
  
  // Configs
  satConfig: SatConfig
  mainConfig: MainConfig
  
  // Metadata
  id?: string
  isNew?: boolean
  hasBeenRun?: boolean // Used to lock TLE generation toggle
}

export const defaultSatConfig: SatConfig = {
  Sim_Length: {
    TimeStepDuration: 60,
    TimeStepCount: 1440,
  },
  Sim_Date_Time: {
    StartYear: 2025,
    StartMonth: 1,
    StartDay: 1,
    StartHour: 0,
    StartMinute: 0,
    StartSecond: 0,
  },
  // True = the simulator generates TLEs matching the configured shells.
  // False makes Phase 1 load a real TLE file, whose satellite count must
  // match the shell config exactly or the run crashes with an IndexError.
  // Defaults OFF: generation only happens when the user explicitly opts in
  // via the "Generate Custom TLEs" toggle in SatConfigForm.
  generate_TLE: false,
  operator_name: 'starlink',
  shells: [
    {
      name: 'shell1',
      // 20×15 = 300 satellites — matches the backend's sat_default.yaml and
      // runs locally in about a minute (the old 72×22 Starlink scale needs
      // the lab compute server).
      orbits: 20,
      sat_per_orbit: 15,
      altitude: 550,
      inclination: 53,
      pattern: 'walker_delta',
      ipp_increment: 1,
      body: 'Earth',
      perturber: 'Moon',
    },
  ],
  tle_id: -1,
  TLEFilePath: '/home/spacenet/simulator/dynamic-topology-generator/utils/',
}

export const defaultMainConfig: MainConfig = {
  ConstellationName: '',
  Debug: 0,
  OutputFilePath: '/home/...',
  MonitorResource: false,
  SourceNode: 0,
  gs_file_id: -1,
  DestNode: 0,
  RouteWeight: 'latency',
  GroundStationFile: '/home/.../gs_default.txt',
  min_elevation_angle: 25,
  AssociationCritGSL: 'BASED_ON_DISTANCE_ONLY_MININET',
  UseWeatherData: false,
  TopoCrit: 0,
}

