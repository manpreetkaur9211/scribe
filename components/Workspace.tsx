'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { TranscriptPanel } from './TranscriptPanel'
import { NotePanel } from './NotePanel'
import { RecordingControls } from './RecordingControls'
import { TemplateSelector } from './TemplateSelector'
import type { AppMode, TemplateId } from '@/types/workspace'
import { getDemoScript } from '@/lib/demo-scripts'

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

  const demoAbortRef = useRef<AbortController | null>(null)
  const demoStartedRef = useRef(false)

  const { isSupported, start: startSpeech, stop: stopSpeech } = useSpeechRecognition({
    onPartial: appendPartial,
    onFinal: appendFinal,
    onError: (err) => console.warn('Speech recognition error:', err),
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
      if ((e as Error).name !== 'AbortError') finishDemo()
    }
  }, [startDemo, advanceDemoCursor, finishDemo])

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
        setNoteError(body.error ?? 'Failed to generate note')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const sentinelRegex = /\[SECTION:(\w+)\]([\s\S]*?)(?=\[SECTION:|$)/g
        let match
        while ((match = sentinelRegex.exec(buffer)) !== null) {
          appendNoteSection(match[1], match[2].trim())
        }
      }
      completeNote()
    } catch {
      setNoteError('Network error — please try again')
    }
  }, [transcript, template, startNoteGeneration, appendNoteSection, completeNote, setNoteError])

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
          />
        </div>
      </div>

      {/* Live mode: unsupported browser warning */}
      {mode === 'live' && !isSupported && (
        <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-6 py-2 text-xs text-amber-700">
          Web Speech API is not supported in this browser. Try Chrome or Edge.
        </div>
      )}
    </div>
  )
}
