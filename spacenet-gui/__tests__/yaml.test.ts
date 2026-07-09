import { generateSatYAML, generateMainYAML, shellsToNamedRecord } from '@/lib/yaml'
import { defaultSatConfig, defaultMainConfig } from '@/types/experiment-config'
import type { SatConfig, MainConfig } from '@/types/experiment-config'

describe('generateSatYAML', () => {
  it('emits Sim_Length fields', () => {
    const yaml = generateSatYAML(defaultSatConfig)
    expect(yaml).toContain('TimeStepDuration: 60')
    expect(yaml).toContain('TimeStepCount: 1440')
  })

  it('emits Sim_Date_Time fields', () => {
    const yaml = generateSatYAML(defaultSatConfig)
    expect(yaml).toContain('StartYear: 2025')
    expect(yaml).toContain('StartMonth: 1')
    expect(yaml).toContain('StartDay: 1')
  })

  it('emits generate_TLE and TLEFilePath', () => {
    const yaml = generateSatYAML(defaultSatConfig)
    expect(yaml).toContain('generate_TLE: true')
    expect(yaml).toContain('TLEFilePath:')
  })

  it('emits shell fields for each shell', () => {
    const yaml = generateSatYAML(defaultSatConfig)
    expect(yaml).toContain('shell1:')
    expect(yaml).toContain('orbits: 72')
    expect(yaml).toContain('sat_per_orbit: 22')
    expect(yaml).toContain('altitude: 550')
    expect(yaml).toContain('inclination: 53')
    expect(yaml).toContain('pattern: walker_delta')
    expect(yaml).toContain('perturber: Moon')
  })

  it('includes operator_name when includeOperatorName is true', () => {
    const yaml = generateSatYAML(defaultSatConfig, { includeOperatorName: true })
    expect(yaml).toContain('operator_name: starlink')
  })

  it('excludes operator_name by default', () => {
    const yaml = generateSatYAML(defaultSatConfig)
    expect(yaml).not.toContain('operator_name:')
  })

  it('uses provided shells override instead of config shells', () => {
    const customShells = [{ ...defaultSatConfig.shells[0], name: 'overridden', altitude: 800 }]
    const yaml = generateSatYAML(defaultSatConfig, { shells: customShells })
    expect(yaml).toContain('name: overridden')
    expect(yaml).toContain('altitude: 800')
    expect(yaml).not.toContain('name: shell1')
  })

  it('produces empty shells section when shells array is empty', () => {
    const yaml = generateSatYAML(defaultSatConfig, { shells: [] })
    expect(yaml).toContain('shells:')
    expect(yaml).not.toContain('shell1:')
  })

  it('uses "None" as default perturber when defaultPerturber is true and perturber is undefined', () => {
    const satWithMissingPerturber: SatConfig = {
      ...defaultSatConfig,
      shells: [{ ...defaultSatConfig.shells[0], perturber: undefined as unknown as 'None' }],
    }
    const yaml = generateSatYAML(satWithMissingPerturber, { defaultPerturber: true })
    expect(yaml).toContain('perturber: None')
  })

  it('accepts shells as a Record<string, ShellConfig>', () => {
    const shellsRecord = { custom: { ...defaultSatConfig.shells[0], name: 'record_shell' } }
    const yaml = generateSatYAML(defaultSatConfig, { shells: shellsRecord })
    expect(yaml).toContain('name: record_shell')
  })

  it('numbers multiple shells sequentially', () => {
    const twoShells = [
      { ...defaultSatConfig.shells[0], name: 'alpha' },
      { ...defaultSatConfig.shells[0], name: 'beta', altitude: 1200 },
    ]
    const yaml = generateSatYAML(defaultSatConfig, { shells: twoShells })
    expect(yaml).toContain('shell1:')
    expect(yaml).toContain('shell2:')
    expect(yaml).toContain('name: alpha')
    expect(yaml).toContain('name: beta')
  })
})

describe('shellsToNamedRecord', () => {
  it('keys an array of shells as shell1, shell2, …', () => {
    const shells = [
      { ...defaultSatConfig.shells[0], name: 'alpha' },
      { ...defaultSatConfig.shells[0], name: 'beta' },
    ]
    const record = shellsToNamedRecord(shells)
    expect(Object.keys(record)).toEqual(['shell1', 'shell2'])
    expect(record.shell1.name).toBe('alpha')
    expect(record.shell2.name).toBe('beta')
  })

  it('re-keys a numeric-keyed record to shellN names', () => {
    // Older saves produced {"0": …, "1": …} — the simulator hardcodes shell1.
    const record = shellsToNamedRecord({
      '0': { ...defaultSatConfig.shells[0], name: 'alpha' },
      '1': { ...defaultSatConfig.shells[0], name: 'beta' },
    })
    expect(Object.keys(record)).toEqual(['shell1', 'shell2'])
    expect(record.shell1.name).toBe('alpha')
  })

  it('returns an empty record for null/undefined shells', () => {
    expect(shellsToNamedRecord(null)).toEqual({})
    expect(shellsToNamedRecord(undefined)).toEqual({})
  })
})

describe('generateMainYAML', () => {
  it('emits core main config fields', () => {
    const yaml = generateMainYAML(defaultMainConfig)
    expect(yaml).toContain('ConstellationName:')
    expect(yaml).toContain('Debug: 0')
    expect(yaml).toContain('MonitorResource: false')
    expect(yaml).toContain('RouteWeight: latency')
    expect(yaml).toContain('min_elevation_angle: 25')
  })

  it('includes Azure block when Azure config is present', () => {
    const mainWithAzure: MainConfig = {
      ...defaultMainConfig,
      Azure: { t2t_use_azure: true },
    }
    const yaml = generateMainYAML(mainWithAzure)
    expect(yaml).toContain('Azure:')
    expect(yaml).toContain('t2t_use_azure: true')
  })

  it('excludes Azure block when Azure config is absent', () => {
    const yaml = generateMainYAML(defaultMainConfig)
    expect(yaml).not.toContain('Azure:')
  })

  it('includes WonderProxy block when WonderProxy config is present', () => {
    const mainWithProxy: MainConfig = {
      ...defaultMainConfig,
      WonderProxy: { t2t_use_wonderproxy: true },
    }
    const yaml = generateMainYAML(mainWithProxy)
    expect(yaml).toContain('WonderProxy:')
    expect(yaml).toContain('t2t_use_wonderproxy: true')
  })

  it('excludes WonderProxy block when WonderProxy config is absent', () => {
    const yaml = generateMainYAML(defaultMainConfig)
    expect(yaml).not.toContain('WonderProxy:')
  })
})
