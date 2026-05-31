import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StorageBar } from '../../components/StorageBar.jsx'

describe('StorageBar component', () => {
  it('shows loading placeholder when storage is null', () => {
    render(<StorageBar storage={null} />)
    expect(screen.getByText('Loading storage...')).toBeInTheDocument()
  })

  it('shows loading placeholder when storage is undefined', () => {
    render(<StorageBar storage={undefined} />)
    expect(screen.getByText('Loading storage...')).toBeInTheDocument()
  })

  it('renders the STORAGE label', () => {
    render(<StorageBar storage={{ percent: 50, used_gb: 5, total_gb: 10 }} />)
    expect(screen.getByText('STORAGE')).toBeInTheDocument()
  })

  it('renders percent value', () => {
    render(<StorageBar storage={{ percent: 45, used_gb: 4.5, total_gb: 10 }} />)
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('renders used / total in GB', () => {
    render(<StorageBar storage={{ percent: 45, used_gb: 4.5, total_gb: 10 }} />)
    expect(screen.getByText('4.5 GB / 10 GB')).toBeInTheDocument()
  })

  it('renders at 0%', () => {
    render(<StorageBar storage={{ percent: 0, used_gb: 0, total_gb: 10 }} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 GB / 10 GB')).toBeInTheDocument()
  })

  it('renders at 100%', () => {
    render(<StorageBar storage={{ percent: 100, used_gb: 10, total_gb: 10 }} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('bar element has correct width style', () => {
    const { container } = render(
      <StorageBar storage={{ percent: 70, used_gb: 7, total_gb: 10 }} />
    )
    const bar = container.querySelector('div[style*="width: 70%"]')
    expect(bar).toBeTruthy()
  })
})
