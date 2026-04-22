'use client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, BookOpen, Shield, BarChart3, Settings } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4">
      {/* Central Content Block */}
      <div className="text-center mb-12">
        {/* Logo */}
        <div className="w-20 h-20 bg-maroon rounded-card mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold">VT</div>
        
        {/* Title */}
        <h1 className="text-4xl font-bold mb-3 text-light-text dark:text-dark-text">SpaceNet Testbed</h1>
        
        {/* Tagline */}
        <p className="text-lg text-light-text/80 dark:text-dark-subtext mb-8">Simulate, emulate, and analyze LEO constellations.</p>
        
        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-6">
          <Link href="/experiments">
            <Button className="bg-maroon hover:bg-maroon-hover active:bg-maroon-pressed flex items-center gap-2">
              Open App
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center justify-center gap-3 text-sm text-light-text/60 dark:text-dark-subtext">
          <Link href="#" className="flex items-center gap-1 hover:text-maroon">
            <BookOpen className="h-4 w-4" />
            View Docs
          </Link>
          <span>•</span>
          <Link href="#" className="hover:text-maroon">About</Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
        <div className="rounded-card bg-light-surface dark:bg-dark-surface p-6 shadow-card-2">
          <div className="w-12 h-12 bg-maroon rounded-card flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-light-text dark:text-dark-text">Constellation Simulation</h3>
          <p className="text-sm text-light-text/70 dark:text-dark-subtext">Simulate Starlink, Kuiper, OneWeb, and custom LEO networks with precise orbital mechanics.</p>
        </div>

        <div className="rounded-card bg-light-surface dark:bg-dark-surface p-6 shadow-card-2">
          <div className="w-12 h-12 bg-maroon rounded-card flex items-center justify-center mb-4">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-light-text dark:text-dark-text">Network Analysis</h3>
          <p className="text-sm text-light-text/70 dark:text-dark-subtext">Real-time metrics for latency, throughput, packet loss, and routing efficiency.</p>
        </div>

        <div className="rounded-card bg-light-surface dark:bg-dark-surface p-6 shadow-card-2">
          <div className="w-12 h-12 bg-maroon rounded-card flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-light-text dark:text-dark-text">YAML Configuration</h3>
          <p className="text-sm text-light-text/70 dark:text-dark-subtext">Import, validate, and export configurations with auto-validation and inline editing.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-5xl flex justify-between items-center text-xs text-light-text/60 dark:text-dark-subtext">
        <p>Developed under Virginia Tech Aerospace & Ocean Engineering - Hume Center Research Group</p>
        <div className="w-6 h-6 bg-light-text/20 dark:bg-dark-subtext/20 rounded"></div>
      </div>
    </div>
  )
}

