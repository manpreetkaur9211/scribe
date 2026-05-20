import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '../hooks/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toHaveLength(0)
  })

  it('adds a toast with toast()', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.toast({ type: 'error', message: 'Something failed' }))
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Something failed')
    expect(result.current.toasts[0].type).toBe('error')
  })

  it('auto-dismisses success toasts after 4 seconds', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.toast({ type: 'success', message: 'Copied!' }))
    expect(result.current.toasts).toHaveLength(1)
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.toasts).toHaveLength(0)
  })

  it('does not auto-dismiss error toasts', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.toast({ type: 'error', message: 'Failed' }))
    act(() => vi.advanceTimersByTime(10000))
    expect(result.current.toasts).toHaveLength(1)
  })

  it('dismisses a toast by id via dismiss()', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.toast({ type: 'error', message: 'Failed' }))
    const id = result.current.toasts[0].id
    act(() => result.current.dismiss(id))
    expect(result.current.toasts).toHaveLength(0)
  })

  it('supports multiple toasts in queue', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast({ type: 'error', message: 'Error 1' })
      result.current.toast({ type: 'success', message: 'Success 1' })
    })
    expect(result.current.toasts).toHaveLength(2)
  })

  it('cancels auto-dismiss timer when success toast is manually dismissed early', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.toast({ type: 'success', message: 'Copied!' }))
    expect(result.current.toasts).toHaveLength(1)
    const id = result.current.toasts[0].id
    // dismiss before the 4s timer fires
    act(() => result.current.dismiss(id))
    expect(result.current.toasts).toHaveLength(0)
    // advance past 4s — timer should not re-add or error
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.toasts).toHaveLength(0)
  })
})
