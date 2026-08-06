'use client'

import { Satellite, FileText, Network, BarChart3, Cloud, Globe, ExternalLink, Github, Mail, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'

export default function AboutPage() {
  const features = [
    {
      icon: FileText,
      title: 'YAML-Based Configuration',
      description: 'Import, validate, and export constellation configurations with auto-validation and inline editing capabilities.',
    },
    {
      icon: Network,
      title: 'Multi-Constellation Support',
      description: 'Pre-configured templates for Starlink, Kuiper, OneWeb, and support for custom constellation designs.',
    },
    {
      icon: BarChart3,
      title: 'Network Metrics Analysis',
      description: 'Real-time analysis of latency, throughput, packet loss, and routing efficiency across orbital shells.',
    },
    {
      icon: Cloud,
      title: 'Weather Modeling',
      description: 'Atmospheric drag analysis and weather impact simulation for LEO operations.',
    },
    {
      icon: Globe,
      title: '3D Visualization',
      description: 'Interactive 3D Earth visualization and topology graphs for results analysis.',
    },
    {
      icon: Satellite,
      title: 'Terrestrial Integration',
      description: 'ISTN support with Azure and WonderProxy integration options.',
    },
  ]
  // Hover-lift effect layered on top of the shared Card shell
  const floatingTileClass =
    'transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-card-2'

  return (
    <div className="min-h-screen p-6 sm:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-12 text-center"
      >
        <div className="inline-flex items-center justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-vt-maroon flex items-center justify-center">
            <Satellite className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-light-text dark:text-dark-text mb-4">
          About SpaceNet Testbed
        </h1>
        <p className="text-lg text-light-text/80 dark:text-dark-subtext max-w-3xl mx-auto">
          A production-grade simulation platform for LEO satellite constellation network analysis,
          developed under Virginia Tech&apos;s Aerospace &amp; Ocean Engineering department.
        </p>
      </motion.div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-4">Mission</h2>
        <Card className={`${floatingTileClass} p-8`}>
          <p className="text-base text-light-text/80 dark:text-dark-subtext leading-relaxed mb-4">
            SpaceNet Testbed provides researchers, engineers, and students with a comprehensive
            platform to simulate, emulate, and analyze Low Earth Orbit (LEO) satellite
            constellation networks. Our mission is to advance space network research through
            accessible, high-fidelity simulation tools.
          </p>
          <p className="text-base text-light-text/80 dark:text-dark-subtext leading-relaxed">
            The platform supports configuration-driven simulations for major constellation
            architectures including Starlink, Project Kuiper, OneWeb, and custom network designs,
            enabling detailed analysis of network performance, routing algorithms, and atmospheric
            effects.
          </p>
        </Card>
      </motion.div>

      {/* Key Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              >
                <Card className={`${floatingTileClass} p-6 h-full flex flex-col`}>
                  <div className="h-12 w-12 rounded-xl bg-vt-maroon/20 dark:bg-vt-maroon/30 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-vt-maroon dark:text-vt-maroon" />
                  </div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-light-text/70 dark:text-dark-subtext leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Research Group */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-4">Research Group</h2>
        <Card className={`${floatingTileClass} p-8`}>
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-full bg-vt-maroon flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">VT</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-3">
                Virginia Tech Aerospace & Ocean Engineering
              </h3>
              <p className="text-base text-light-text/80 dark:text-dark-subtext leading-relaxed mb-4">
                Developed under the Hume Center Research Group, this platform represents ongoing research in
                satellite network simulation and space systems engineering.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://www.aoe.vt.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-vt-maroon hover:text-vt-maroon-hover flex items-center gap-1.5 text-sm font-medium"
                >
                  Department Website <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <a
                  href="https://www.hume.vt.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-vt-maroon hover:text-vt-maroon-hover flex items-center gap-1.5 text-sm font-medium"
                >
                  Hume Center <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Technology Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-4">Technology Stack</h2>
        <Card className={`${floatingTileClass} p-8`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">Frontend</h3>
              <ul className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext">
                <li>React</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">Simulation</h3>
              <ul className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext">
                <li>Python Backend</li>
                <li>YAML Config</li>
                <li>CSV Output</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">Analysis</h3>
              <ul className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext">
                <li>Network Metrics</li>
                <li>Orbital Mechanics</li>
                <li>Data Visualization</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">Standards</h3>
              <ul className="space-y-2 text-sm text-light-text/80 dark:text-dark-subtext">
                <li>WCAG AA+</li>
                <li>Responsive</li>
                <li>Dark/Light Mode</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Links & Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Links & Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`${floatingTileClass} p-6 flex flex-col items-center text-center`}>
            <div className="h-12 w-12 rounded-xl bg-light-bg dark:bg-dark-bg flex items-center justify-center mb-4">
              <Github className="h-6 w-6 text-light-text dark:text-dark-text" />
            </div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">GitHub</h3>
            <p className="text-sm text-light-text/70 dark:text-dark-subtext">
              View source code, documentation, and contribute to the project.
            </p>
          </Card>
          <Card className={`${floatingTileClass} p-6 flex flex-col items-center text-center`}>
            <div className="h-12 w-12 rounded-xl bg-light-bg dark:bg-dark-bg flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-light-text dark:text-dark-text" />
            </div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Documentation</h3>
            <p className="text-sm text-light-text/70 dark:text-dark-subtext">
              Complete guides for YAML configuration, simulation setup, and analysis.
            </p>
          </Card>
          <Card className={`${floatingTileClass} p-6 flex flex-col items-center text-center`}>
            <div className="h-12 w-12 rounded-xl bg-light-bg dark:bg-dark-bg flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-light-text dark:text-dark-text" />
            </div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Contact</h3>
            <p className="text-sm text-light-text/70 dark:text-dark-subtext">
              Questions, feedback, or collaboration inquiries welcome.
            </p>
          </Card>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        className="text-center text-sm text-light-text/60 dark:text-dark-subtext pt-8 border-t border-light-border dark:border-dark-border"
      >
        © 2025 SpaceNet Testbed | Virginia Tech Aerospace & Ocean Engineering
      </motion.div>
    </div>
  )
}
