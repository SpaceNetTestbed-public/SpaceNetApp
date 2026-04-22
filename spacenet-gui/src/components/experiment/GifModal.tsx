'use client'

import { Button } from '@/components/ui/button'

interface GifModalProps {
  isOpen: boolean
  gifUrl: string | null
  onClose: () => void
}

export function GifModal({ isOpen, gifUrl, onClose }: GifModalProps) {
  if (!isOpen || !gifUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-light-surface dark:bg-dark-surface border w-full max-w-3xl p-6 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Simulation GIF</h2>
        <div className="flex justify-center">
          <img src={gifUrl} alt="Simulation GIF" className="max-h-[600px] w-auto rounded-md" />
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
