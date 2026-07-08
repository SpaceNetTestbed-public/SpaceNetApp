import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders the %s variant with its children',
    (variant) => {
      render(<Button variant={variant}>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    },
  )

  it.each(['sm', 'md', 'lg'] as const)('renders the %s size', (size) => {
    render(<Button size={size}>Sized</Button>)
    expect(screen.getByRole('button', { name: 'Sized' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    render(
      <Button onClick={onClick} disabled>
        Nope
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Nope' })
    expect(button).toBeDisabled()
    await user.click(button).catch(() => undefined)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards its ref to the underlying button element', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('passes through native button attributes', () => {
    render(
      <Button type="submit" aria-label="Submit form">
        Submit
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Submit form' })).toHaveAttribute('type', 'submit')
  })
})
