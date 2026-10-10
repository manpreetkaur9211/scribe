import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LandingView } from '../components/LandingView'

afterEach(cleanup)

describe('live availability', () => {
  it('blocks live entry while keeping the sample demo available', () => {
    const select = vi.fn()
    render(<LandingView liveAvailable={false} onSelectMode={select} />)
    const live = screen.getByRole('button', { name: /try live/i })
    expect(live).toBeDisabled()
    fireEvent.click(live)
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /demo consultation/i }))
    expect(select).toHaveBeenCalledWith('demo')
    expect(screen.getByText(/live mode is currently unavailable/i)).toBeInTheDocument()
  })

  it('allows live entry when enabled', () => {
    const select = vi.fn()
    render(<LandingView liveAvailable onSelectMode={select} />)
    fireEvent.click(screen.getByRole('button', { name: /try live/i }))
    expect(select).toHaveBeenCalledWith('live')
  })
})
