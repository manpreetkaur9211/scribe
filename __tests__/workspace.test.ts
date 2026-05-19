import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspace } from '../hooks/useWorkspace'

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
}))

describe('useWorkspace — transcript state machine', () => {
  it('starts in idle', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    expect(result.current.transcript.status).toBe('idle')
  })

  it('transitions idle → recording via startRecording', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    expect(result.current.transcript.status).toBe('recording')
  })

  it('appends partials in recording state', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.appendPartial('Patient '))
    const t = result.current.transcript
    if (t.status !== 'recording') throw new Error('expected recording')
    expect(t.partials).toBe('Patient ')
  })

  it('appends finals and clears partials in recording state', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.appendPartial('Patient pres'))
    act(() => result.current.appendFinal('Patient presents '))
    const t = result.current.transcript
    if (t.status !== 'recording') throw new Error('expected recording')
    expect(t.finals).toBe('Patient presents ')
    expect(t.partials).toBe('')
  })

  it('transitions recording → done via stopRecording', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.appendFinal('Patient has chest pain '))
    act(() => result.current.stopRecording())
    const t = result.current.transcript
    expect(t.status).toBe('done')
    if (t.status !== 'done') throw new Error('expected done')
    expect(t.text).toBe('Patient has chest pain ')
  })

  it('transitions any → idle via reset', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.reset())
    expect(result.current.transcript.status).toBe('idle')
  })
})

describe('useWorkspace — note state machine', () => {
  it('starts note in idle', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    expect(result.current.note.status).toBe('idle')
  })

  it('transitions to streaming via startNoteGeneration', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    expect(result.current.note.status).toBe('streaming')
  })

  it('appends section content during streaming', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.appendNoteSection('chiefComplaint', 'Chest pain × 3 days'))
    const n = result.current.note
    if (n.status !== 'streaming') throw new Error('expected streaming')
    expect((n.sections as Record<string, string>).chiefComplaint).toBe('Chest pain × 3 days')
  })

  it('transitions streaming → done via completeNote', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.appendNoteSection('chiefComplaint', 'Chest pain × 3 days'))
    act(() => result.current.appendNoteSection('hpi', 'Substernal, non-radiating'))
    act(() => result.current.appendNoteSection('assessment', 'Likely GORD'))
    act(() => result.current.appendNoteSection('plan', 'PPI trial, follow up 2 weeks'))
    act(() => result.current.completeNote())
    expect(result.current.note.status).toBe('done')
  })

  it('transitions done → editing via startEditing', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.completeNote())
    act(() => result.current.startEditing())
    expect(result.current.note.status).toBe('editing')
  })

  it('transitions editing → done via stopEditing', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.completeNote())
    act(() => result.current.startEditing())
    act(() => result.current.stopEditing())
    expect(result.current.note.status).toBe('done')
  })

  it('transitions streaming → error via setNoteError', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.setNoteError('Claude API error'))
    const n = result.current.note
    expect(n.status).toBe('error')
    if (n.status !== 'error') throw new Error('expected error')
    expect(n.message).toBe('Claude API error')
  })

  it('updates section content via updateSection', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startNoteGeneration())
    act(() => result.current.appendNoteSection('chiefComplaint', 'Chest pain × 3 days'))
    act(() => result.current.completeNote())
    act(() => result.current.startEditing())
    act(() => result.current.updateSection('chiefComplaint', 'Edited chest pain'))
    const n = result.current.note
    if (n.status !== 'editing') throw new Error('expected editing')
    expect((n.sections as Record<string, string>).chiefComplaint).toBe('Edited chest pain')
  })

  it('resets both machines via reset', () => {
    const { result } = renderHook(() => useWorkspace('live'))
    act(() => result.current.startRecording())
    act(() => result.current.startNoteGeneration())
    act(() => result.current.reset())
    expect(result.current.transcript.status).toBe('idle')
    expect(result.current.note.status).toBe('idle')
  })
})
