'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { DocsDrawer } from './DocsDrawer'
import { Button } from './ui/button'

export function FloatingDocsButton() {
  const [docsOpen, setDocsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setDocsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-vt-maroon hover:bg-vt-maroon-hover text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center p-0"
        aria-label="Open documentation"
      >
        <BookOpen className="h-6 w-6" />
      </Button>
      <DocsDrawer open={docsOpen} onClose={() => setDocsOpen(false)} />
    </>
  )
}

