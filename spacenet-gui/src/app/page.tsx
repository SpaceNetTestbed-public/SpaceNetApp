import Link from 'next/link'
import { HomeNavbar } from '@/components/HomeNavbar'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileText, Info, Mouse, Satellite, BarChart3, Network, Download, Settings, Globe, Database, Gauge } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050509] text-black dark:text-white">
      {/* Navbar */}
      <HomeNavbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background GIF animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Light mode GIF */}
          <img 
            src="/gif_traffic.gif" 
            alt="Traffic visualization" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 dark:opacity-0 transition-opacity duration-300"
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
          {/* Dark mode GIF */}
          <img 
            src="/gif_traffic_negetive.gif" 
            alt="Traffic visualization dark" 
            className="absolute inset-0 w-full h-full object-cover opacity-0 dark:opacity-30 transition-opacity duration-300"
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center gap-8">
          {/* Logo */}
          <div className="h-20 w-20 rounded-2xl bg-vt-maroon flex items-center justify-center mb-4">
            <Satellite className="h-10 w-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-black dark:text-white">
            SpaceNet Testbed
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-slate-700 dark:text-slate-300 font-light">
            A web platform for simulating and analyzing Low Earth Orbit (LEO) constellations
          </p>

          {/* Supporting text */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Used by researchers at Virginia Tech to design and test LEO constellations
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link href="/experiments" className="transition-transform duration-300 ease-out hover:-translate-y-1">
              <Button variant="primary" className="text-lg px-8 py-6 rounded-2xl flex items-center gap-2 transition-all duration-300">
                Open App <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Secondary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link href="#about" className="transition-transform duration-300 ease-out hover:-translate-y-1">
              <Button variant="ghost" className="text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white flex items-center gap-2 transition-all duration-300">
                <FileText className="h-4 w-4" />
                Documentation
              </Button>
            </Link>
            <Link href="#how-it-works" className="transition-transform duration-300 ease-out hover:-translate-y-1">
              <Button variant="ghost" className="text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white flex items-center gap-2 transition-all duration-300">
                <Info className="h-4 w-4" />
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#about" aria-label="Scroll to About section" className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-scroll-bounce">
          <div className="w-6 h-10 border-2 border-black/30 dark:border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 bg-black/50 dark:bg-white/50 rounded-full"></div>
          </div>
        </a>
      </section>

      {/* About SpaceNet Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0b0b10]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-black dark:text-white">About SpaceNet</h2>
          <p className="text-center text-slate-600 dark:text-slate-300 text-lg max-w-3xl mx-auto mb-12">
            SpaceNet Testbed provides researchers with a comprehensive platform for constellation design, network simulation, and performance analysis.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* Card 1 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Satellite className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Constellation Simulation</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Model Starlink, OneWeb, Amazon Kuiper, and custom LEO networks with precise orbital mechanics and real-world parameters.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-orange/90 dark:bg-vt-orange/80 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Network Performance Analysis</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Real-time metrics for latency, throughput, packet loss, routing efficiency, and inter-satellite link performance.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Network className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Results Visualization</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Interactive 3D Earth visualization, topology graphs, and comprehensive data export capabilities for further analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#050509]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-black dark:text-white">How It Works</h2>
          <p className="text-center text-slate-600 dark:text-slate-300 text-lg max-w-3xl mx-auto mb-12">
            Three simple steps to run your satellite constellation simulation
          </p>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 relative">
            {/* Step 1 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 relative transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-vt-orange flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Create</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Choose an operator type (Starlink, OneWeb, Kuiper) or define custom parameters for your constellation.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 relative transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-vt-orange flex items-center justify-center text-white text-sm font-bold">
                2
              </div>
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Configure & Run</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Edit YAML configuration with auto-validation, set simulation parameters, and launch your experiment.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 relative transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-vt-orange flex items-center justify-center text-white text-sm font-bold">
                3
              </div>
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Download className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Visualize & Export</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                View real-time 3D simulation, analyze performance metrics, and download results in multiple formats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Researchers Section */}
      <section id="researchers" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0b0b10]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-black dark:text-white">Built for Researchers</h2>
          <p className="text-center text-slate-600 dark:text-slate-300 text-lg max-w-3xl mx-auto mb-12">
            SpaceNet Testbed is designed for academic research, network architecture validation, and open-access constellation testing.
          </p>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
            {/* Card 1 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Extensible Architecture</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                YAML-based configuration system supports custom constellation designs, new orbital shells, and pluggable routing algorithms.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Open Access Testing</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Designed for academic institutions and research labs to validate satellite network designs and run comparative studies.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Real-World Data</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Simulations use real orbital parameters, ground station files, and (future) weather/atmospheric models.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-black/10 dark:border-white/5 p-6 flex flex-col gap-4 transition-transform duration-300 ease-out hover:-translate-y-2 cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-vt-maroon/90 dark:bg-vt-maroon/80 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black dark:text-white">Comprehensive Metrics</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Includes latency CDFs, hop count, coverage-over-time graphs, link utilization, and routing path analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-black/80 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-slate-400 text-sm mb-2">
                Developed under Virginia Tech Aerospace & Ocean Engineering – Hume Center Research Group
              </p>
              <p className="text-slate-500 text-xs">
                © 2025 Virginia Tech. For academic research and educational purposes.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/SpaceNetTestbed-public"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                aria-label="GitHub"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <div className="h-10 w-10 rounded-full bg-vt-maroon flex items-center justify-center text-white font-bold text-sm">
                VT
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
