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
                {/* <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
                    YAML Configuration Structure
                  </h3> */}

                  {/* constellation_template.yaml */}
                  {/* <div className="mb-6 p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
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
                  </div> */}

                  {/* main_config.yaml */}
                  {/* <div className="mb-6 p-4 rounded-card bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
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
                </section> */}

                {/* Example Configuration */}
                {/* <section>
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
                </section> */}

                {/* Running Simulations */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Running Simulations
                  </h3>
                  <ol className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-decimal list-inside">
                    <li>
                      <span className="font-semibold">Create experiment</span> – On the experiments page you can press the create button to create an experiment.
                      
                      <ul className="mt-2 ml-6 space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-disc list-inside">
                        <li>
                          <span className="font-semibold">Default config</span> – When only providing a name of the experiment, it would create a page that is editable via the GUI.
                        </li>
                        <li>
                          <span className="font-semibold">Config only</span> – Users can upload custom config files that adds defaults to the output path and id specific fields.
                        </li>
                        <li>
                          <span className="font-semibold">Entire Experiment</span> – Users can upload experiment zip files that includes outputs but not configurable in the GUI at the moment.
                        </li>
                        <li>
                          <span className="font-semibold">Duplicate Experiment</span> – Users press the elipses and press Duplicate to create another experiment similar to the selected one
                        </li>
                      </ul>
                    </li><br></br>
                    <li>
                      <span className="font-semibold">Configure Experiment</span>
                      
                      <ul className="mt-2 ml-6 space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-disc list-inside">
                        <li>
                          <span className="font-semibold">Custom Config</span> – You can edit custom configurations by pressing the elipses and pressing Edit. Example configurations can be 
                        </li>
                        <li>
                          <span className="font-semibold">Regular Config</span> – Users can press the Edit Config button to edit their experiment via the GUI with descriptions
                        </li>
                      </ul>
                    </li><br></br>
                    <li>
                      <span className="font-semibold">Custom Files</span> – These files are updated on the top toolbar. Only non-custom experiments support these.
                      
                      <ul className="mt-2 ml-6 space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-disc list-inside">
                        <li>
                          <span className="font-semibold">TLE Files</span> – You can create/upload TLE files to the app on the TLE tab. An example could be found at this <a href="https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle">site</a>
                        </li>
                        <li>
                          <span className="font-semibold">Ground Station Files</span> – You can create Ground Station files via the Ground Station tab. You can input different stations with custom names and coordinates one at a time.
                        </li>
                      </ul>
                    </li><br></br>
                    <li>
                      <span className="font-semibold">Jobs</span> – This app is based on a queue system so experiment runs {"don't"} clog up system resources quickly
                      
                      <ul className="mt-2 ml-6 space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-disc list-inside">
                        <li>
                          <span className="font-semibold">Queue</span> – The job queue can be found in the Jobs tab on the top bar. You can view logs and cancel experiments.
                        </li>
                        <li>
                          <span className="font-semibold">Run Simulation Page</span> – This page shows outputs but also the logs of the last completed experiment (May add running log as well for convenience) 
                        </li>
                      </ul>
                    </li>
                  </ol>
                </section>

                {/* Interpreting Results */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Interpreting Results
                  </h3>
                  <div className="space-y-3 text-sm text-light-text/80 dark:text-dark-subtext leading-relaxed">
                    <p>
                      Results can be seen when pressing the Run Simulation button on the experiments page or after editing the configuration.
                      Every result can be downloaded straight from the website or from: <br></br><br></br><i>{"<spacenet-backend-loc>/local_workspace/<id>"}</i>
                    </p><br></br>
                  </div>
                  <ul className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext list-decimal list-inside">
                    <li>
                      <span className="font-semibold">Phase 1 Results</span> – a dynamic network topology that describes how satellites and
                       ground stations are connected over time. This topology is required for Phase 2 to emulate communication in Mininet.
                    </li>
                    <li>
                      <span className="font-semibold">View GIF</span> – Shows the connections of ground stations and satellites over time.
                    </li>
                    <li>
                      <span className="font-semibold">3D Interactive Model</span> – Shows the connection over an interactive model at a certain time stamp
                    </li>
                    <li>
                      <span className="font-semibold">Phase 2 Results</span> – Emulates and test the network topology in phase 1
                    </li>
                  </ul>
                </section>

                {/* Hardware Integration */}
                {/* <section>
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
                </section> */}

                {/* Additional Resources */}
                <section>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">
                    Additional Resources
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="https://github.com/SpaceNetTestbed-public"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-maroon hover:text-maroon-hover"
                    >
                      → GitHub Repository <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://doi.org/10.2514/6.2025-2716"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-maroon hover:text-maroon-hover"
                    >
                      → SciTech 2025 Manuscript (DOI) <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="mailto:anthonymai@vt.edu"
                      className="flex items-center gap-2 text-sm text-maroon hover:text-maroon-hover"
                    >
                      → Contact Developer
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
