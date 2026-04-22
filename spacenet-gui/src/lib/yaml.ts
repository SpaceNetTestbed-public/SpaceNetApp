import type { ExperimentConfig, ShellConfig, SatConfig } from '@/types/experiment-config'

type ShellsInput = SatConfig['shells'] | Record<string, ShellConfig> | undefined | null

function normalizeShells(shells: ShellsInput): ShellConfig[] {
  if (!shells) return []
  return Array.isArray(shells) ? shells : Object.values(shells)
}

export function generateSatYAML(
  sat: ExperimentConfig['satConfig'],
  options?: {
    includeOperatorName?: boolean
    shells?: ShellsInput
    defaultPerturber?: boolean
  }
) {
  const shells = normalizeShells(options?.shells ?? sat.shells)
  const includeOperatorName = options?.includeOperatorName ?? false
  const defaultPerturber = options?.defaultPerturber ?? false
  const operatorLine = includeOperatorName ? `\noperator_name: ${sat.operator_name}` : ''

  return `Sim_Length:
  TimeStepDuration: ${sat.Sim_Length.TimeStepDuration}
  TimeStepCount: ${sat.Sim_Length.TimeStepCount}
Sim_Date_Time:
  StartYear: ${sat.Sim_Date_Time.StartYear}
  StartMonth: ${sat.Sim_Date_Time.StartMonth}
  StartDay: ${sat.Sim_Date_Time.StartDay}
  StartHour: ${sat.Sim_Date_Time.StartHour}
  StartMinute: ${sat.Sim_Date_Time.StartMinute}
  StartSecond: ${sat.Sim_Date_Time.StartSecond}
generate_TLE: ${sat.generate_TLE}${operatorLine}
shells:${shells
    .map((s, i) => `
  shell${i + 1}:
    name: ${s.name}
    orbits: ${s.orbits}
    sat_per_orbit: ${s.sat_per_orbit}
    altitude: ${s.altitude}
    inclination: ${s.inclination}
    pattern: ${s.pattern}
    ipp_increment: ${s.ipp_increment}
    body: ${s.body}
    perturber: ${defaultPerturber ? s.perturber ?? 'None' : s.perturber}`)
    .join('')}
TLEFilePath: ${sat.TLEFilePath}`
}

export function generateMainYAML(main: ExperimentConfig['mainConfig']) {
  return `ConstellationName: ${main.ConstellationName}
Debug: ${main.Debug}
OutputFilePath: ${main.OutputFilePath}
MonitorResource: ${main.MonitorResource}
SourceNode: ${main.SourceNode}
DestNode: ${main.DestNode}
RouteWeight: ${main.RouteWeight}
GroundStationFile: ${main.GroundStationFile}
min_elevation_angle: ${main.min_elevation_angle}
AssociationCritGSL: ${main.AssociationCritGSL}
UseWeatherData: ${main.UseWeatherData}
TopoCrit: ${main.TopoCrit}${main.Azure ? `\nAzure:
  t2t_use_azure: ${main.Azure.t2t_use_azure}` : ''}${main.WonderProxy ? `\nWonderProxy:
  t2t_use_wonderproxy: ${main.WonderProxy.t2t_use_wonderproxy}` : ''}`
}
