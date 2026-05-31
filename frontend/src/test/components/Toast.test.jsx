import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from '../../components/Toast.jsx'

describe('Toast component', () => {
  it('renders message text', () => {
    render(<Toast message="Hello World" onClose={() => {}} />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders success variant by default', () => {
    const { container } = render(<Toast message="Done" onClose={() => {}} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders error variant', () => {
    const { container } = render(<Toast message="Oops" type="error" onClose={() => {}} />)
    expect(container.firstChild).toBeInTheDocument()
    expect(screen.getByText('Oops')).toBeInTheDocument()
  })

  it('renders info variant', () => {
    const { container } = render(<Toast message="FYI" type="info" onClose={() => {}} />)
    expect(container.firstChild).toBeInTheDocument()
    expect(screen.getByText('FYI')).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn()
    render(<Toast message="Click me" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after 4 seconds', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<Toast message="Auto close" onClose={onClose} />)
    act(() => vi.advanceTimersByTime(4000))
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('does not dismiss before 4 seconds', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<Toast message="Not yet" onClose={onClose} />)
    act(() => vi.advanceTimersByTime(3999))
    expect(onClose).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('clears timer on unmount', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { unmount } = render(<Toast message="Unmount me" onClose={onClose} />)
    unmount()
    act(() => vi.advanceTimersByTime(5000))
    expect(onClose).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
