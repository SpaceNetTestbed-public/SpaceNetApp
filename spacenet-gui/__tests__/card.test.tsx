import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

describe('Card', () => {
  it('renders header, content, and footer children', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Phase 1</CardTitle>
        </CardHeader>
        <CardContent>Topology generation</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>,
    )
    expect(screen.getByRole('heading', { name: 'Phase 1' })).toBeInTheDocument()
    expect(screen.getByText('Topology generation')).toBeInTheDocument()
    expect(screen.getByText('Footer actions')).toBeInTheDocument()
  })

  it('merges custom classNames on the shell', () => {
    render(<Card className="custom-shell">Inner</Card>)
    expect(screen.getByText('Inner')).toHaveClass('custom-shell')
  })
})
