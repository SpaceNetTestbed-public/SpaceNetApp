import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input, Textarea } from '@/components/ui/input'

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Experiment name" />)
    expect(screen.getByLabelText('Experiment name')).toBeInTheDocument()
  })

  it('accepts typed text', async () => {
    const user = userEvent.setup()
    render(<Input label="Name" />)
    const input = screen.getByLabelText('Name')
    await user.type(input, 'Alpha')
    expect(input).toHaveValue('Alpha')
  })

  it('shows the error message and marks the input invalid', () => {
    render(<Input label="Name" error="Name is required" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const message = screen.getByRole('alert')
    expect(message).toHaveTextContent('Name is required')
    expect(input.getAttribute('aria-describedby')).toContain(message.id)
  })

  it('is not marked invalid without an error', () => {
    render(<Input label="Name" />)
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
  })

  it('links helper text via aria-describedby', () => {
    render(<Input label="Name" helperText="Shown on the experiments list" />)
    const input = screen.getByLabelText('Name')
    const helper = screen.getByText('Shown on the experiments list')
    expect(input.getAttribute('aria-describedby')).toContain(helper.id)
  })

  it('respects an explicit id', () => {
    render(<Input id="custom-id" label="Name" />)
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'custom-id')
  })
})

describe('Textarea', () => {
  it('associates the label and reports errors like Input', () => {
    render(<Textarea label="Description" error="Too long" />)
    const textarea = screen.getByLabelText('Description')
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Too long')
  })
})
