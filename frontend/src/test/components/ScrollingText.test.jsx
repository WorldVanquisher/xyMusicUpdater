import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrollingText } from '../../components/ScrollingText.jsx'

describe('ScrollingText component', () => {
  it('renders the provided text', () => {
    render(<ScrollingText text="Hello World" />)
    const elements = screen.getAllByText('Hello World')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders with an empty string without crashing', () => {
    const { container } = render(<ScrollingText text="" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with long text without crashing', () => {
    const long = 'A'.repeat(200)
    const { container } = render(<ScrollingText text={long} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom style to the container', () => {
    const { container } = render(
      <ScrollingText text="Styled" style={{ color: 'rgb(255, 0, 0)', fontSize: '20px' }} />
    )
    const wrapper = container.firstChild
    expect(wrapper.style.color).toBe('rgb(255, 0, 0)')
    expect(wrapper.style.fontSize).toBe('20px')
  })

  it('container has overflow hidden and full width', () => {
    const { container } = render(<ScrollingText text="Test" />)
    const wrapper = container.firstChild
    expect(wrapper.style.overflow).toBe('hidden')
    expect(wrapper.style.width).toBe('100%')
  })

  it('does not duplicate text when widths are equal (no scroll needed)', () => {
    render(<ScrollingText text="Short" />)
    // In jsdom, offsetWidth is always 0 — both textWidth and containerWidth = 0
    // canScroll = false → only one span rendered
    const elements = screen.queryAllByText('Short')
    expect(elements.length).toBe(1)
  })
})
