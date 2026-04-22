// Shared numeric and string constants used across the frontend.
// Low-priority cleanup for magic numbers / repeated literals.

// Ground station latitude/longitude limits (degrees)
export const LATITUDE_MIN = -90
export const LATITUDE_MAX = 90
export const LONGITUDE_MIN = -180
export const LONGITUDE_MAX = 180

// Shell / orbit constraints
export const ALTITUDE_MIN_KM = 200
export const ALTITUDE_MAX_KM = 2000
export const INCLINATION_MIN_DEG = 0
export const INCLINATION_MAX_DEG = 180

// Simulation length limits
export const SIM_TIME_STEP_DURATION_MIN = 1
export const SIM_TIME_STEP_DURATION_MAX = 86400
export const SIM_TIME_STEP_COUNT_MIN = 1
export const SIM_TIME_STEP_COUNT_MAX = 1_000_000

// Shell editor limits
export const MIN_ORBITS = 1
export const MAX_ORBITS = 10_000
export const MIN_SATS_PER_ORBIT = 1
export const MAX_SATS_PER_ORBIT = 10_000
export const IPP_INCREMENT_MIN = 1

