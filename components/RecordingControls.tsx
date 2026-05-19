import type { AppMode, NoteState, TranscriptState } from '@/types/workspace'

interface RecordingControlsProps {
  transcript: TranscriptState
  note: NoteState
  mode: Exclude<AppMode, 'landing'>
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onStartDemo: () => void
  onStopDemo: () => void
  onGenerateNote: () => void
  onReset: () => void
}

export function RecordingControls({
  transcript,
  note,
  mode,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onStartDemo,
  onStopDemo,
  onGenerateNote,
  onReset,
}: RecordingControlsProps) {
  const isGenerating = note.status === 'streaming'
  const noteReady = note.status === 'idle'

  return (
    <div className="px-6 py-4 border-t border-slate-800 flex gap-3 shrink-0">
      {transcript.status === 'idle' && mode === 'live' && (
        <PrimaryButton onClick={onStartRecording}>
          <MicIcon /> Start Recording
        </PrimaryButton>
      )}

      {transcript.status === 'idle' && mode === 'demo' && (
        <PrimaryButton onClick={onStartDemo}>
          <PlayIcon /> Start Demo
        </PrimaryButton>
      )}

      {transcript.status === 'recording' && (
        <>
          <PrimaryButton onClick={onStopRecording} disabled={isGenerating}>
            Stop &amp; Generate Note
          </PrimaryButton>
          <GhostButton onClick={onCancelRecording}>Cancel</GhostButton>
        </>
      )}

      {transcript.status === 'demo-playing' && (
        <>
          <PrimaryButton onClick={onGenerateNote} disabled={isGenerating}>
            Generate Note
          </PrimaryButton>
          <GhostButton onClick={onStopDemo}>Stop Demo</GhostButton>
        </>
      )}

      {transcript.status === 'done' && (
        <>
          {noteReady && (
            <PrimaryButton onClick={onGenerateNote} disabled={isGenerating}>
              Generate Note
            </PrimaryButton>
          )}
          <GhostButton onClick={onReset} disabled={isGenerating}>
            Clear &amp; Start Over
          </GhostButton>
        </>
      )}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
    >
      {children}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
    >
      {children}
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
