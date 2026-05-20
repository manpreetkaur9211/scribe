# Toast & Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toast notification system and fix all 6 silent/invisible error paths so every failure surfaces to the user regardless of which panel they're viewing.

**Architecture:** A custom `useToast` hook holds a queue of toast objects; a `Toast` component renders them in a fixed overlay at the bottom of `Workspace.tsx`. Success toasts auto-dismiss after 4 s; error toasts persist until dismissed. All 6 error gaps (route unguarded streamText, silent !reader, swallowed speech errors, swallowed demo errors, silent clipboard, invisible inline note errors) are wired through `toast()`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4, Vitest

---

## File Map

| File | Action | What changes |
|---|---|---|
| `hooks/useToast.ts` | Create | Toast queue state machine — `useToast` hook |
| `components/Toast.tsx` | Create | Fixed-position toast overlay UI |
| `app/api/generate-note/route.ts` | Modify | Wrap `streamText` in try/catch, return JSON 502 |
| `components/Workspace.tsx` | Modify | Add `useToast`, wire all 6 error paths, mount `<Toast>` |
| `__tests__/useToast.test.ts` | Create | Unit tests for toast hook |
| `__tests__/generate-note.test.ts` | Modify | Add test for 502 path |

---

## Task 1: `useToast` hook (TDD)

**Files:**
- Create: `__tests__/useToast.test.ts`
- Create: `hooks/useToast.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/useToast.test.ts`:

```typescript
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npm test -- __tests__/useToast.test.ts
```

Expected: FAIL — `useToast` module not found

- [ ] **Step 3: Create `hooks/useToast.ts`**

```typescript
'use client'

import { useCallback, useReducer, useRef } from 'react'

export type ToastType = 'success' | 'error'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'DISMISS'; id: string }

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast]
    case 'DISMISS':
      return state.filter(t => t.id !== action.id)
    default:
      return state
  }
}

let counter = 0

export function useToast() {
  const [toasts, dispatch] = useReducer(toastReducer, [])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    dispatch({ type: 'DISMISS', id })
  }, [])

  const toast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = `toast-${++counter}`
    dispatch({ type: 'ADD', toast: { id, type, message } })
    if (type === 'success') {
      const timer = setTimeout(() => {
        dispatch({ type: 'DISMISS', id })
        timersRef.current.delete(id)
      }, 4000)
      timersRef.current.set(id, timer)
    }
  }, [])

  return { toasts, toast, dismiss }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npm test -- __tests__/useToast.test.ts
```

Expected: 6/6 PASS

- [ ] **Step 5: Commit**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && git add hooks/useToast.ts __tests__/useToast.test.ts && git commit -m "feat: add useToast hook with queue, auto-dismiss, and manual dismiss

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: `Toast` UI component

**Files:**
- Create: `components/Toast.tsx`

No unit test for the UI component — it has no logic beyond rendering what `useToast` provides. The hook is fully tested.

- [ ] **Step 1: Create `components/Toast.tsx`**

```typescript
'use client'

import type { Toast as ToastItem } from '@/hooks/useToast'

interface ToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm pointer-events-auto max-w-sm ${
            t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-slate-800 text-white'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          {t.type === 'error' && (
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
            >
              <XIcon />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 3: Commit**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && git add components/Toast.tsx && git commit -m "feat: add Toast overlay component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Fix route — guard `streamText` with try/catch (TDD)

**Files:**
- Modify: `__tests__/generate-note.test.ts`
- Modify: `app/api/generate-note/route.ts`

- [ ] **Step 1: Add failing test for the 502 path**

In `__tests__/generate-note.test.ts`, the `vi.mock('ai', ...)` at the top mocks `streamText` to always resolve. Add a second `describe` block that overrides it to reject. Append this to the end of the file (after the closing `}` of the existing describe block):

```typescript
describe('POST /api/generate-note — model error', () => {
  it('returns 502 with JSON error when streamText throws', async () => {
    const { streamText } = await import('ai')
    vi.mocked(streamText).mockRejectedValueOnce(new Error('Bedrock throttled'))

    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Patient is a 45 year old male with chest pain for 3 days',
        template: 'gp-note',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Bedrock throttled')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npm test -- __tests__/generate-note.test.ts
```

Expected: the new test FAILS — route currently throws unhandled, returns no structured JSON

- [ ] **Step 3: Update `app/api/generate-note/route.ts`**

Replace the full file:

```typescript
import { streamText } from 'ai'
import { z } from 'zod'
import { anthropic } from '@/lib/claude'
import { buildNotePrompt } from '@/lib/prompts'

export const runtime = 'edge'

const bodySchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters').max(5000),
  template: z.enum(['gp-note', 'specialist-referral', 'ed-triage']),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ data: null, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { transcript, template } = parsed.data
  const prompt = buildNotePrompt(template, transcript)

  let result
  try {
    result = await streamText({
      model: anthropic('anthropic.claude-sonnet-4-6-20251001-v1:0'),
      prompt,
      maxOutputTokens: 1024,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Model request failed'
    return Response.json({ data: null, error: message }, { status: 502 })
  }

  return result.toTextStreamResponse()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npm test -- __tests__/generate-note.test.ts
```

Expected: 5/5 PASS (4 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && git add app/api/generate-note/route.ts __tests__/generate-note.test.ts && git commit -m "fix: return JSON 502 when streamText throws instead of unhandled 500

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Wire all error paths in `Workspace.tsx`

**Files:**
- Modify: `components/Workspace.tsx`

This task has no dedicated unit test — `Workspace.tsx` is an integration component whose behaviour is covered by the existing route and hook tests. The 6 wiring changes are verified by the full test suite passing.

- [ ] **Step 1: Replace the full contents of `components/Workspace.tsx`**

```typescript
'use client'
// owns browser state: speech recognition lifecycle, streaming fetch loops, keyboard shortcuts

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useToast } from '@/hooks/useToast'
import { TranscriptPanel } from './TranscriptPanel'
import { NotePanel } from './NotePanel'
import { RecordingControls } from './RecordingControls'
import { TemplateSelector } from './TemplateSelector'
import { Toast } from './Toast'
import type { AppMode, TemplateId } from '@/types/workspace'
import { getDemoScript } from '@/lib/demo-scripts'
import { parseCompleteSections, parseFinalSection } from '@/lib/parse-note-stream'

interface WorkspaceProps {
  mode: Exclude<AppMode, 'landing'>
}

export function Workspace({ mode }: WorkspaceProps) {
  const [template, setTemplate] = useState<TemplateId>('gp-note')
  const {
    transcript, note,
    startRecording, appendPartial, appendFinal, stopRecording,
    startDemo, advanceDemoCursor, finishDemo,
    startNoteGeneration, appendNoteSection, completeNote,
    startEditing, stopEditing, updateSection, setNoteError, reset,
  } = useWorkspace(mode)

  const { toasts, toast, dismiss } = useToast()

  const demoAbortRef = useRef<AbortController | null>(null)
  const demoStartedRef = useRef(false)

  const { isSupported, start: startSpeech, stop: stopSpeech } = useSpeechRecognition({
    onPartial: appendPartial,
    onFinal: appendFinal,
    // Gap 3 fixed: speech errors now surface as toast
    onError: (err) => toast({ type: 'error', message: `Microphone error: ${err}` }),
  })

  const handleStartRecording = useCallback(() => {
    startRecording()
    startSpeech()
  }, [startRecording, startSpeech])

  const handleStopRecording = useCallback(() => {
    stopSpeech()
    stopRecording()
  }, [stopSpeech, stopRecording])

  const handleCancelRecording = useCallback(() => {
    stopSpeech()
    reset()
  }, [stopSpeech, reset])

  const handleStartDemo = useCallback(async () => {
    const script = getDemoScript('gp-chest-pain')
    setTemplate(script.defaultTemplate)
    const abort = new AbortController()
    demoAbortRef.current = abort
    startDemo()

    try {
      const res = await fetch(`/api/demo-transcript?script=${script.id}`, {
        signal: abort.signal,
      })
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = JSON.parse(line.slice(6)) as { type: string; text?: string }
          if (json.type === 'word' && json.text) advanceDemoCursor(json.text)
          if (json.type === 'done') finishDemo()
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      // Gap 4 fixed: demo stream errors now surface as toast
      finishDemo()
      toast({ type: 'error', message: 'Demo failed to load — please try again' })
    }
  }, [startDemo, advanceDemoCursor, finishDemo, toast])

  const handleStopDemo = useCallback(() => {
    demoAbortRef.current?.abort()
    finishDemo()
  }, [finishDemo])

  const handleGenerateNote = useCallback(async () => {
    const text =
      transcript.status === 'done'
        ? transcript.text
        : transcript.status === 'demo-playing'
        ? transcript.text
        : ''
    if (!text) return

    startNoteGeneration()

    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, template }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        const message = body.error ?? 'Failed to generate note'
        setNoteError(message)
        // Gap 6 fixed: inline note error also shown as toast
        toast({ type: 'error', message })
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        // Gap 2 fixed: null reader exits streaming state with an error
        const message = 'Streaming unavailable — please try again'
        setNoteError(message)
        toast({ type: 'error', message })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let offset = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { updates, newOffset } = parseCompleteSections(buffer, offset)
        offset = newOffset
        for (const { key, content } of updates) {
          appendNoteSection(key, content)
        }
      }
      const final = parseFinalSection(buffer)
      if (final) appendNoteSection(final.key, final.content)
      completeNote()
    } catch {
      // Gap 6 fixed: network errors shown as toast in addition to inline state
      const message = 'Network error — please try again'
      setNoteError(message)
      toast({ type: 'error', message })
    }
  }, [transcript, template, startNoteGeneration, appendNoteSection, completeNote, setNoteError, toast])

  const handleCopyNote = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Gap 5 fixed: clipboard copy success confirmed via toast
      toast({ type: 'success', message: 'Note copied to clipboard' })
    } catch {
      toast({ type: 'error', message: 'Failed to copy — please copy manually' })
    }
  }, [toast])

  const handleTemplateChange = useCallback((t: TemplateId) => {
    setTemplate(t)
    if (note.status === 'done' || note.status === 'editing') {
      reset()
    }
  }, [note.status, reset])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        if (transcript.status === 'done' && note.status === 'idle') handleGenerateNote()
      }
      if (e.key === 'Escape') {
        if (transcript.status === 'recording') handleCancelRecording()
        if (transcript.status === 'demo-playing') handleStopDemo()
      }
      if (mod && e.key === 'Backspace') {
        if (note.status !== 'streaming' && transcript.status !== 'recording') reset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [transcript, note, handleGenerateNote, handleCancelRecording, handleStopDemo, reset])

  // Auto-start demo on mount in demo mode
  useEffect(() => {
    if (mode === 'demo' && !demoStartedRef.current) {
      demoStartedRef.current = true
      handleStartDemo()
    }
  // only runs on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shrink-0">
        <span className="text-sm font-bold tracking-tight">
          <span className="text-slate-800">Clin</span>
          <span className="text-[#7c3aed]">Scribe</span>
        </span>
        <TemplateSelector value={template} note={note} onChange={handleTemplateChange} />
      </div>

      {/* Split panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: dark transcript panel */}
        <div className="flex flex-col w-1/2 border-r border-slate-800 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <TranscriptPanel transcript={transcript} mode={mode} />
          </div>
          <RecordingControls
            transcript={transcript}
            note={note}
            mode={mode}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onCancelRecording={handleCancelRecording}
            onStartDemo={handleStartDemo}
            onStopDemo={handleStopDemo}
            onGenerateNote={handleGenerateNote}
            onReset={reset}
          />
        </div>

        {/* Right: light note panel */}
        <div className="w-1/2 overflow-hidden">
          <NotePanel
            note={note}
            template={template}
            onStartEditing={startEditing}
            onStopEditing={stopEditing}
            onUpdateSection={updateSection}
            onCopy={handleCopyNote}
          />
        </div>
      </div>

      {/* Live mode: unsupported browser warning */}
      {mode === 'live' && !isSupported && (
        <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-6 py-2 text-xs text-amber-700">
          Web Speech API is not supported in this browser. Try Chrome or Edge.
        </div>
      )}

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
```

- [ ] **Step 2: Update `NotePanel.tsx` to accept and use `onCopy` prop**

The clipboard logic moves out of `NotePanel` and into `Workspace` so toasts can be shown. Replace the full contents of `components/NotePanel.tsx`:

```typescript
'use client'
// contentEditable refs and clipboard API require DOM access

import { useCallback, useRef } from 'react'
import type { NoteState, TemplateId } from '@/types/workspace'
import { SECTION_LABELS, getSectionKeys } from '@/lib/note-sections'

interface NotePanelProps {
  note: NoteState
  template: TemplateId
  onStartEditing: () => void
  onStopEditing: () => void
  onUpdateSection: (key: string, content: string) => void
  onCopy: (text: string) => void
}

export function NotePanel({
  note,
  template,
  onStartEditing,
  onStopEditing,
  onUpdateSection,
  onCopy,
}: NotePanelProps) {
  const sectionKeys = getSectionKeys(template)
  const labels = SECTION_LABELS[template]

  const handleCopy = useCallback(() => {
    if (note.status !== 'done' && note.status !== 'editing') return
    const sections = note.sections as Record<string, string>
    const text = sectionKeys
      .map(key => `${labels[key].toUpperCase()}\n${sections[key] ?? ''}`)
      .join('\n\n')
    onCopy(text)
  }, [note, sectionKeys, labels, onCopy])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Clinical Note
        </span>
        {(note.status === 'done' || note.status === 'editing') && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            aria-label="Copy full note to clipboard"
          >
            <CopyIcon />
            Copy Note
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {note.status === 'idle' && (
          <p className="text-slate-400 italic text-sm">
            Generate a note from the transcript to see it here.
          </p>
        )}

        {note.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
            {note.message}
          </div>
        )}

        {(note.status === 'streaming' || note.status === 'done' || note.status === 'editing') &&
          sectionKeys.map(key => {
            const sections = note.sections as Record<string, string>
            const content = sections[key]
            const isStreaming = note.status === 'streaming' && content === undefined
            const isEditable = note.status === 'editing'

            return (
              <NoteSection
                key={key}
                label={labels[key] ?? key}
                content={content ?? ''}
                isStreaming={isStreaming}
                isEditable={isEditable}
                onFocus={onStartEditing}
                onBlur={(val, relatedTarget) => {
                  onUpdateSection(key, val)
                  const stayingInPanel = relatedTarget instanceof HTMLElement && relatedTarget.isContentEditable
                  if (!stayingInPanel) onStopEditing()
                }}
              />
            )
          })}
      </div>
    </div>
  )
}

interface NoteSectionProps {
  label: string
  content: string
  isStreaming: boolean
  isEditable: boolean
  onFocus: () => void
  onBlur: (value: string, relatedTarget: EventTarget | null) => void
}

function NoteSection({ label, content, isStreaming, isEditable, onFocus, onBlur }: NoteSectionProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className="border-l-2 border-violet-400 pl-4" aria-busy={isStreaming}>
      <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {isStreaming ? (
        <div className="space-y-2" aria-label={`Generating ${label}`}>
          <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <div
          ref={ref}
          contentEditable={isEditable}
          suppressContentEditableWarning
          onFocus={onFocus}
          onBlur={(e) => onBlur(ref.current?.innerText ?? '', e.relatedTarget)}
          className={`text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[1.5rem] rounded px-1 -mx-1 ${
            isEditable
              ? 'outline outline-2 outline-violet-300 bg-violet-50 cursor-text'
              : 'cursor-default hover:bg-slate-50 transition-colors'
          }`}
          aria-label={`${label} — click to edit`}
          aria-multiline="true"
        >
          {content}
        </div>
      )}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 4: Run full test suite**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && npm test
```

Expected: all tests pass (45 existing + 5 new useToast = 50+ passing)

- [ ] **Step 5: Commit**

```bash
cd c:/Users/SuperPc/workspace/clinscribe-preview && git add components/Workspace.tsx components/NotePanel.tsx && git commit -m "feat: wire all 6 error paths through toast notifications

- Speech recognition errors → toast (was: console.warn)
- Demo stream errors → toast + reset (was: silent finishDemo)
- Note generation errors → toast + inline state (was: inline only)
- Null reader case → error state + toast (was: hung in streaming)
- Clipboard copy → success/error toast (was: silent)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Gap 1 (route unguarded streamText): Task 3
- ✅ Gap 2 (silent !reader): Task 4, `Workspace.tsx` null reader branch
- ✅ Gap 3 (speech recognition errors): Task 4, `onError` callback
- ✅ Gap 4 (demo stream errors): Task 4, demo catch block
- ✅ Gap 5 (clipboard copy feedback): Task 4, `handleCopyNote` + `NotePanel` `onCopy` prop
- ✅ Gap 6 (inline errors invisible): Task 4, `handleGenerateNote` and catch also call `toast()`
- ✅ `useToast` hook: Task 1
- ✅ `Toast` UI component: Task 2
- ✅ Error toasts persist until dismissed: `useToast` — no timer on `type: 'error'`
- ✅ Success toasts auto-dismiss after 4s: `useToast` — setTimeout 4000ms
- ✅ Route returns JSON 502 on model failure: Task 3

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `Toast` (interface in `useToast.ts`) → `ToastItem` aliased in `Toast.tsx` import — consistent
- `onCopy: (text: string) => void` defined in `NotePanelProps`, called in `Workspace.tsx` as `onCopy={handleCopyNote}` where `handleCopyNote: (text: string) => Promise<void>` — `Promise<void>` is assignable to `void` in TypeScript callback position, no issue
- `useToast()` returns `{ toasts, toast, dismiss }` — used as `{ toasts, toast, dismiss }` in `Workspace.tsx` — consistent
- `Toast` component receives `toasts: ToastItem[]` and `onDismiss: (id: string) => void` — matches `dismiss` from `useToast` — consistent
