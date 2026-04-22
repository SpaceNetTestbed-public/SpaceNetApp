'use client'

import { X, Copy, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface DocsDrawerProps {
  open: boolean
  onClose: () => void
}

export function DocsDrawer({ open, onClose }: DocsDrawerProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  const exampleYAML = `# constellation_template.yaml

ConstellationName: Starlink_1584
TotalSatCnt: 1584
TotalGSCnt: 10
shell1:
  altitude: 550
  inclination: 53
  orbits: 72
  sat_per_orbit: 22
TLEFilePath: ./data/starlink.tle
GroundStationFile: ./data/ground_stations.csv
OutputFilePath: ./output/constellation_output.yaml`

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleYAML)
    setCopied(true)
    toast.success('Example configuration copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
                    SpaceNet Documentation
                  </h2>
                  <p className="text-sm text-light-text/60 dark:text-dark-subtext mt-1">
                    Quick reference guide
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" aria-label="Close documentation">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-8">
                {/* Overview Section */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Overview
                  </h3>
                  <div className="space-y-3 text-sm text-light-text/80 dark:text-dark-subtext leading-relaxed">
                    <p>
                      SpaceNet Testbed is a multi-functional LEO satellite network testbed designed for
                      constellation simulation and performance analysis. It integrates STK-based orbital
                      mechanics with network routing algorithms to evaluate satellite communication systems.
                    </p>
                    <p>
                      The testbed supports various constellation architectures including Starlink, OneWeb,
                      Project Kuiper, and custom configurations for research and development purposes.
                    </p>
                  </div>
                </section>

                {/* YAML Configuration Structure */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
                    YAML Configuration Structure
                  </h3>

                  {/* constellation_template.yaml */}
                  <div className="mb-6 p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
                    <h4 className="text-sm font-mono font-semibold text-maroon dark:text-maroon mb-3">
                      constellation_template.yaml
                    </h4>
                    <ul className="space-y-1.5 text-xs text-light-text/70 dark:text-dark-subtext">
                      <li>
                        <span className="font-semibold">ConstellationName</span> – Unique identifier for the constellation
                      </li>
                      <li>
                        <span className="font-semibold">TotalSatCnt</span> – Total number of satellites
                      </li>
                      <li>
                        <span className="font-semibold">TotalGSCnt</span> – Total number of ground stations
                      </li>
                      <li>
                        <span className="font-semibold">shell1.altitude</span> – Orbital altitude in km
                      </li>
                      <li>
                        <span className="font-semibold">shell1.inclination</span> – Orbital inclination in degrees
                      </li>
                      <li>
                        <span className="font-semibold">shell1.orbits</span> – Number of orbital planes
                      </li>
                      <li>
                        <span className="font-semibold">shell1.sat_per_orbit</span> – Satellites per orbital plane
                      </li>
                    </ul>
                  </div>

                  {/* main_config.yaml */}
                  <div className="mb-6 p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
                    <h4 className="text-sm font-mono font-semibold text-maroon dark:text-maroon mb-3">
                      main_config.yaml
                    </h4>
                    <ul className="space-y-1.5 text-xs text-light-text/70 dark:text-dark-subtext">
                      <li>
                        <span className="font-semibold">EpochIntervalDuration</span> – Simulation time step (seconds)
                      </li>
                      <li>
                        <span className="font-semibold">EpochIntervalCount</span> – Number of simulation steps
                      </li>
                      <li>
                        <span className="font-semibold">RouteWeight</span> – Routing algorithm (shortest-path, hop-count)
                      </li>
                      <li>
                        <span className="font-semibold">SourceNode</span> – Starting node ID
                      </li>
                      <li>
                        <span className="font-semibold">DestNode</span> – Destination node ID
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Example Configuration */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                      Example Configuration
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 px-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      {copied ? 'Copied!' : 'Copy Example'}
                    </Button>
                  </div>
                  <div className="p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
                    <pre className="text-xs font-mono text-light-text/70 dark:text-dark-subtext whitespace-pre-wrap overflow-x-auto">
                      {exampleYAML}
                    </pre>
                  </div>
                </section>

                {/* Running Simulations */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Running Simulations
                  </h3>
                  <ol className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-decimal list-inside">
                    <li>
                      <span className="font-semibold">Import YAML</span> – Upload your configuration file. The system
                      automatically validates all required fields.
                    </li>
                    <li>
                      <span className="font-semibold">Review Validation</span> – Check for any missing or invalid fields.
                      Green checkmark indicates ready to run.
                    </li>
                    <li>
                      <span className="font-semibold">Run Simulation</span> – Click the Run Simulation button. Progress
                      updates appear in real-time.
                    </li>
                    <li>
                      <span className="font-semibold">View Results</span> – Once complete, download output files and
                      review metrics.
                    </li>
                  </ol>
                </section>

                {/* Interpreting Results */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Interpreting Results
                  </h3>
                  <div className="space-y-3 text-sm text-light-text/80 dark:text-dark-subtext">
                    <div>
                      <span className="font-semibold">📄 constellation_output.yaml</span>
                      <p className="ml-5 mt-1">
                        Contains final satellite positions, link connectivity matrices, and network topology data.
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold">📊 network_metrics.csv</span>
                      <p className="ml-5 mt-1">
                        Includes latency statistics, packet loss rates, throughput measurements, and link utilization
                        over time.
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold">🗒️ simulation_logs.txt</span>
                      <p className="ml-5 mt-1">
                        Detailed execution logs showing initialization, epoch progression, and any warnings or errors.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Hardware Integration */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Hardware Integration (HIL)
                  </h3>
                  <p className="text-sm text-light-text/80 dark:text-dark-subtext leading-relaxed mb-2">
                    The testbed supports Hardware-in-the-Loop (HIL) testing for real satellite communication hardware.
                    Configure the following parameters in your YAML:
                  </p>
                  <ul className="space-y-1.5 text-sm text-light-text/80 dark:text-dark-subtext ml-4 list-disc">
                    <li>
                      <span className="font-semibold">Gateways: true</span> – Enable gateway nodes
                    </li>
                    <li>
                      <span className="font-semibold">Azure: true</span> – Connect to Azure cloud endpoints
                    </li>
                    <li>
                      <span className="font-semibold">WonderProxy: true</span> – Use proxy for geolocation testing
                    </li>
                  </ul>
                </section>

                {/* Additional Resources */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Additional Resources
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="https://github.com/vt-spacenet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-maroon hover:text-maroon-hover"
                    >
                      → GitHub Repository <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="#"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-maroon hover:text-maroon-hover"
                    >
                      → SciTech 2025 Manuscript (DOI) <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-2 text-sm text-maroon hover:text-maroon-hover"
                    >
                      → Contact Support
                    </a>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
