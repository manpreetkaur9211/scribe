'use client'

import { useCallback, useRef } from 'react'
import type { NoteState, TemplateId } from '@/types/workspace'
import { SECTION_LABELS, getSectionKeys } from '@/lib/note-sections'

interface NotePanelProps {
  note: NoteState
  template: TemplateId
  onStartEditing: () => void
  onStopEditing: () => void
  onUpdateSection: (key: string, content: string) => void
}

export function NotePanel({
  note,
  template,
  onStartEditing,
  onStopEditing,
  onUpdateSection,
}: NotePanelProps) {
  const sectionKeys = getSectionKeys(template)
  const labels = SECTION_LABELS[template]

  const handleCopy = useCallback(async () => {
    if (note.status !== 'done' && note.status !== 'editing') return
    const sections = note.sections as Record<string, string>
    const text = sectionKeys
      .map(key => `${labels[key].toUpperCase()}\n${sections[key] ?? ''}`)
      .join('\n\n')
    await navigator.clipboard.writeText(text)
  }, [note, sectionKeys, labels])

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
            aria-keyshortcuts="Control+Shift+C Meta+Shift+C"
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
                label={labels[key]}
                content={content ?? ''}
                isStreaming={isStreaming}
                isEditable={isEditable}
                onFocus={onStartEditing}
                onBlur={(val) => {
                  onUpdateSection(key, val)
                  onStopEditing()
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
  onBlur: (value: string) => void
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
          onBlur={() => onBlur(ref.current?.innerText ?? '')}
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
