import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperimentCard } from '@/components/ExperimentCard'
import { apiFetch } from '@/lib/api'
import type { Experiment } from '@/types/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/link', () => {
  function MockLink({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      transition: _t,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      transition?: unknown
    }) => <div {...rest}>{children}</div>,
  },
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}))

const mockExperiment: Experiment = {
  id: 'exp-1',
  name: 'Alpha Mission',
  is_custom: false,
  description: 'First test experiment',
  tags: ['leo', 'starlink'],
  created_at: '2025-01-15T10:00:00Z',
  hasPhase1: true,
  hasPhase2: false,
}

function renderCard(overrides: Partial<Experiment> = {}) {
  const onDelete = jest.fn()
  const onDuplicate = jest.fn()
  const onEdit = jest.fn()
  const experiment = { ...mockExperiment, ...overrides }
  render(
    <ExperimentCard
      experiment={experiment}
      index={0}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onEdit={onEdit}
    />,
  )
  return { onDelete, onDuplicate, onEdit }
}

describe('ExperimentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the experiment name', () => {
    renderCard()
    expect(screen.getByText('Alpha Mission')).toBeInTheDocument()
  })

  it('renders the description', () => {
    renderCard()
    expect(screen.getByText('First test experiment')).toBeInTheDocument()
  })

  it('renders all tags', () => {
    renderCard()
    expect(screen.getByText('leo')).toBeInTheDocument()
    expect(screen.getByText('starlink')).toBeInTheDocument()
  })

  it('shows Phase 1 Only status badge when only hasPhase1 is true', () => {
    renderCard({ hasPhase1: true, hasPhase2: false })
    expect(screen.getByText('Phase 1 Only')).toBeInTheDocument()
  })

  it('shows Complete status badge when hasPhase2 is true', () => {
    renderCard({ hasPhase1: true, hasPhase2: true })
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('shows No Output status badge when both phases are false', () => {
    renderCard({ hasPhase1: false, hasPhase2: false })
    expect(screen.getByText('No Output')).toBeInTheDocument()
  })

  it('renders no tags section when tags array is empty', () => {
    renderCard({ tags: [] })
    expect(screen.queryByText('leo')).not.toBeInTheDocument()
  })

  it('calls onDelete with the experiment id after confirming deletion', async () => {
    jest.mocked(apiFetch).mockResolvedValueOnce({})

    const user = userEvent.setup()
    const { onDelete } = renderCard()

    await user.click(screen.getByLabelText('Open actions for Alpha Mission'))

    const deleteItem = await screen.findByRole('menuitem', { name: /delete/i })
    await user.click(deleteItem)

    const confirmButton = await screen.findByRole('button', { name: /^Delete$/ })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/experiments/exp-1', { method: 'DELETE' })
      expect(onDelete).toHaveBeenCalledWith('exp-1')
    })
  })

  it('does not call onDelete when deletion is cancelled', async () => {
    const user = userEvent.setup()
    const { onDelete } = renderCard()

    await user.click(screen.getByLabelText('Open actions for Alpha Mission'))
    const deleteItem = await screen.findByRole('menuitem', { name: /delete/i })
    await user.click(deleteItem)

    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(apiFetch).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })
})
