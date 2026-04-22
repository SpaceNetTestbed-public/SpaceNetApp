'use client'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeToggle({ className }: { className?: string }){
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" className={`rounded-btn ${className || ''}`} aria-label="Toggle theme">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const isDark = theme === 'dark'
  return (
    <Button variant="ghost" className={`rounded-btn ${className || ''}`} aria-label="Toggle theme"
      onClick={()=>setTheme(isDark ? 'light' : 'dark')}>
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}

