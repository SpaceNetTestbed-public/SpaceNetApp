import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it.each(['success', 'warning', 'error', 'info', 'neutral'] as const)(
    'renders children for the %s variant',
    (variant) => {
      render(<Badge variant={variant}>Status text</Badge>)
      expect(screen.getByText('Status text')).toBeInTheDocument()
    },
  )

  it('renders a pulse dot when pulse is set', () => {
    render(<Badge variant="info" pulse>Running</Badge>)
    const dot = screen.getByTestId('badge-pulse')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders no pulse dot by default', () => {
    render(<Badge variant="success">Finished</Badge>)
    expect(screen.queryByTestId('badge-pulse')).not.toBeInTheDocument()
  })

  it('merges a custom className', () => {
    render(<Badge className="custom-class">Tagged</Badge>)
    expect(screen.getByText('Tagged')).toHaveClass('custom-class')
  })
})
