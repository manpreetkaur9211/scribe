import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null as ((e: unknown) => void) | null,
  onerror: null as ((e: unknown) => void) | null,
  onend: null as (() => void) | null,
}

function MockSpeechRecognition() { return mockRecognition }
MockSpeechRecognition.prototype = mockRecognition

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(global, 'webkitSpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.resetModules()
})

describe('useSpeechRecognition', () => {
  it('reports isSupported true when SpeechRecognition exists', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const { result } = renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn() })
    )
    expect(result.current.isSupported).toBe(true)
  })

  it('calls recognition.start() when start() is called', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const { result } = renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn() })
    )
    act(() => result.current.start())
    expect(mockRecognition.start).toHaveBeenCalledOnce()
  })

  it('calls recognition.stop() when stop() is called', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const { result } = renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn() })
    )
    act(() => result.current.start())
    act(() => result.current.stop())
    expect(mockRecognition.stop).toHaveBeenCalledOnce()
  })

  it('calls onPartial for interim results', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const onPartial = vi.fn()
    renderHook(() =>
      useSpeechRecognition({ onPartial, onFinal: vi.fn(), onError: vi.fn() })
    )
    act(() => {
      mockRecognition.onresult?.({
        results: [
          Object.assign([{ transcript: 'hello ' }], { isFinal: false }),
        ],
        resultIndex: 0,
      })
    })
    expect(onPartial).toHaveBeenCalledWith('hello ')
  })

  it('calls onFinal for final results', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const onFinal = vi.fn()
    renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal, onError: vi.fn() })
    )
    act(() => {
      mockRecognition.onresult?.({
        results: [
          Object.assign([{ transcript: 'hello world ' }], { isFinal: true }),
        ],
        resultIndex: 0,
      })
    })
    expect(onFinal).toHaveBeenCalledWith('hello world ')
  })

  it('calls onError on recognition error', async () => {
    const { useSpeechRecognition } = await import('../hooks/useSpeechRecognition')
    const onError = vi.fn()
    renderHook(() =>
      useSpeechRecognition({ onPartial: vi.fn(), onFinal: vi.fn(), onError })
    )
    act(() => {
      mockRecognition.onerror?.({ error: 'not-allowed' })
    })
    expect(onError).toHaveBeenCalledWith('not-allowed')
  })
})
