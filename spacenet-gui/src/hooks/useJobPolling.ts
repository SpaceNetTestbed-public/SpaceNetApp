import { useEffect, useRef } from 'react'

interface UseJobPollingOptions {
  intervalMs: number
  enabled?: boolean
  immediate?: boolean
}

export function useJobPolling(
  onPoll: () => void | Promise<void>,
  { intervalMs, enabled = true, immediate = false }: UseJobPollingOptions
): void {
  const onPollRef = useRef(onPoll)
  onPollRef.current = onPoll

  useEffect(() => {
    if (!enabled) return

    let interval: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      onPollRef.current()
    }

    const start = () => {
      if (interval || document.hidden) return
      interval = setInterval(tick, intervalMs)
    }

    const stop = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        tick()
        start()
      }
    }

    if (immediate) tick()
    start()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, intervalMs, immediate])
}
