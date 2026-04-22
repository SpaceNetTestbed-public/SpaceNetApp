import { ExperimentConfig, ShellConfig } from '@/types/experiment-config'
import { toast } from 'sonner'
import {
  ALTITUDE_MIN_KM,
  ALTITUDE_MAX_KM,
  INCLINATION_MIN_DEG,
  INCLINATION_MAX_DEG,
  SIM_TIME_STEP_DURATION_MIN,
  SIM_TIME_STEP_DURATION_MAX,
  SIM_TIME_STEP_COUNT_MIN,
  SIM_TIME_STEP_COUNT_MAX,
  IPP_INCREMENT_MIN,
} from '@/lib/constants'

export function validateExperimentConfig(config: ExperimentConfig): boolean {
  if (!config.experimentName.trim()) {
    toast.error('Experiment name is required')
    return false
  }

  // Validate shells
  const shells: ShellConfig[] = Array.isArray(config.satConfig.shells)
    ? config.satConfig.shells
    : (Object.values(config.satConfig.shells ?? {}) as ShellConfig[])
  
  for (let i = 0; i < shells.length; i++) {
    const s = shells[i]
    if (s.altitude < ALTITUDE_MIN_KM || s.altitude > ALTITUDE_MAX_KM) {
      toast.error(
        `Shell ${i + 1}: Altitude must be between ${ALTITUDE_MIN_KM} and ${ALTITUDE_MAX_KM} km.`,
        { id: 'config-validation' }
      )
      return false
    }
    if (s.inclination < INCLINATION_MIN_DEG || s.inclination > INCLINATION_MAX_DEG) {
      toast.error(
        `Shell ${i + 1}: Inclination must be between ${INCLINATION_MIN_DEG} and ${INCLINATION_MAX_DEG} degrees.`,
        { id: 'config-validation' }
      )
      return false
    }
    if (s.orbits < 1 || s.sat_per_orbit < 1) {
      toast.error(`Shell ${i + 1}: Orbits and satellites per orbit must be at least 1.`, { id: 'config-validation' })
      return false
    }
    if (s.ipp_increment < IPP_INCREMENT_MIN) {
      toast.error(`Shell ${i + 1}: IPP increment must be at least ${IPP_INCREMENT_MIN}.`, { id: 'config-validation' })
      return false
    }
  }

  // Validate Sim_Length
  const sl = config.satConfig.Sim_Length
  if (sl.TimeStepDuration < SIM_TIME_STEP_DURATION_MIN || sl.TimeStepDuration > SIM_TIME_STEP_DURATION_MAX) {
    toast.error(
      `Time step duration must be between ${SIM_TIME_STEP_DURATION_MIN} and ${SIM_TIME_STEP_DURATION_MAX} seconds.`,
      { id: 'config-validation' }
    )
    return false
  }
  if (sl.TimeStepCount < SIM_TIME_STEP_COUNT_MIN || sl.TimeStepCount > SIM_TIME_STEP_COUNT_MAX) {
    toast.error(
      `Time step count must be between ${SIM_TIME_STEP_COUNT_MIN} and ${SIM_TIME_STEP_COUNT_MAX.toLocaleString()}.`,
      { id: 'config-validation' }
    )
    return false
  }

  // Validate min_elevation_angle
  const elev = config.mainConfig.min_elevation_angle
  if (typeof elev !== 'number' || elev < 0 || elev > 90) {
    toast.error('Minimum elevation angle must be between 0 and 90 degrees.', { id: 'config-validation' })
    return false
  }

  return true
}
