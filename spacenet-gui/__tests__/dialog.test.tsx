import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(
      {
        children,
        initial: _i,
        animate: _a,
        transition: _t,
        ...rest
      }: React.HTMLAttributes<HTMLDivElement> & {
        initial?: unknown
        animate?: unknown
        transition?: unknown
      },
      ref: React.Ref<HTMLDivElement>,
    ) {
      return (
        <div ref={ref} {...rest}>
          {children}
        </div>
      )
    }),
  },
}))

function renderDialog(open = true) {
  const onClose = jest.fn()
  render(
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Create TLE file</DialogTitle>
      </DialogHeader>
      <DialogBody>Body content</DialogBody>
      <DialogFooter>
        <Button variant="secondary">Cancel</Button>
      </DialogFooter>
    </Dialog>,
  )
  return { onClose }
}

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    renderDialog(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an aria-modal dialog labelled by its title when open', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const title = screen.getByText('Create TLE file')
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id)
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('moves focus into the dialog when opened', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()
    await user.click(screen.getByTestId('dialog-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the panel itself is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()
    await user.click(screen.getByText('Body content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose from the header close button', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // Regression: the focus/Escape effect used to list onClose in its deps. Every
  // caller passes an inline arrow, so each keystroke re-ran the effect and moved
  // focus to the panel — inputs accepted one character at a time.
  it('keeps focus in a dialog input while typing, with an inline onClose', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(true)
      const [name, setName] = React.useState('')
      return (
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogBody>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </DialogBody>
        </Dialog>
      )
    }

    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByLabelText('Name')
    await user.click(input)
    await user.keyboard('test')

    expect(input).toHaveValue('test')
    expect(document.activeElement).toBe(input)
  })
})
