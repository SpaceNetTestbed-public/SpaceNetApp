import { renderHook } from '@testing-library/react'
import { useJobPolling } from '@/hooks/useJobPolling'

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
}

describe('useJobPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setDocumentHidden(false)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calls onPoll on each interval tick', () => {
    const onPoll = jest.fn()
    renderHook(() => useJobPolling(onPoll, { intervalMs: 1000 }))

    expect(onPoll).not.toHaveBeenCalled()
    jest.advanceTimersByTime(3000)
    expect(onPoll).toHaveBeenCalledTimes(3)
  })

  it('calls onPoll immediately when immediate is true', () => {
    const onPoll = jest.fn()
    renderHook(() => useJobPolling(onPoll, { intervalMs: 1000, immediate: true }))

    expect(onPoll).toHaveBeenCalledTimes(1)
  })

  it('stops polling on unmount', () => {
    const onPoll = jest.fn()
    const { unmount } = renderHook(() => useJobPolling(onPoll, { intervalMs: 1000 }))

    jest.advanceTimersByTime(1000)
    expect(onPoll).toHaveBeenCalledTimes(1)

    unmount()
    jest.advanceTimersByTime(5000)
    expect(onPoll).toHaveBeenCalledTimes(1)
  })

  it('does not poll while enabled is false', () => {
    const onPoll = jest.fn()
    renderHook(() => useJobPolling(onPoll, { intervalMs: 1000, enabled: false }))

    jest.advanceTimersByTime(5000)
    expect(onPoll).not.toHaveBeenCalled()
  })

  it('starts polling once enabled flips to true', () => {
    const onPoll = jest.fn()
    const { rerender } = renderHook(
      ({ enabled }) => useJobPolling(onPoll, { intervalMs: 1000, enabled }),
      { initialProps: { enabled: false } }
    )

    jest.advanceTimersByTime(2000)
    expect(onPoll).not.toHaveBeenCalled()

    rerender({ enabled: true })
    jest.advanceTimersByTime(1000)
    expect(onPoll).toHaveBeenCalledTimes(1)
  })

  it('pauses when the tab hides and resumes with an immediate tick when visible again', () => {
    const onPoll = jest.fn()
    renderHook(() => useJobPolling(onPoll, { intervalMs: 1000 }))

    jest.advanceTimersByTime(1000)
    expect(onPoll).toHaveBeenCalledTimes(1)

    setDocumentHidden(true)
    document.dispatchEvent(new Event('visibilitychange'))

    jest.advanceTimersByTime(5000)
    expect(onPoll).toHaveBeenCalledTimes(1)

    setDocumentHidden(false)
    document.dispatchEvent(new Event('visibilitychange'))

    expect(onPoll).toHaveBeenCalledTimes(2)
    jest.advanceTimersByTime(1000)
    expect(onPoll).toHaveBeenCalledTimes(3)
  })
})
