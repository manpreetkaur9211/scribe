import { useEffect, useRef } from 'react'
import type { AppMode, TranscriptState } from '@/types/workspace'

interface TranscriptPanelProps {
  transcript: TranscriptState
  mode: Exclude<AppMode, 'landing'>
}

export function TranscriptPanel({ transcript, mode }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  const isLive = mode === 'live'
  const isRecording = transcript.status === 'recording'
  const isPlaying = transcript.status === 'demo-playing'

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Transcript
        </span>
        <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
          {isRecording && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              <span className="text-xs text-red-400">Recording</span>
            </>
          )}
          {isPlaying && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              <span className="text-xs text-emerald-400">Playing demo</span>
            </>
          )}
          {!isLive && !isRecording && !isPlaying && transcript.status === 'idle' && (
            <span className="text-xs text-slate-500">Demo mode</span>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Live transcript"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed"
      >
        {transcript.status === 'idle' && (
          <p className="text-slate-600 italic">
            {isLive
              ? 'Start recording to see the transcript here.'
              : 'Run the demo to see the transcript here.'}
          </p>
        )}

        {transcript.status === 'recording' && (
          <span>
            <span className="text-white">{transcript.finals}</span>
            <span className="text-amber-400">{transcript.partials}</span>
            <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" aria-hidden="true" />
          </span>
        )}

        {transcript.status === 'demo-playing' && (
          <span>
            <span className="text-white">{transcript.text}</span>
            <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" aria-hidden="true" />
          </span>
        )}

        {transcript.status === 'done' && (
          <span className="text-white">{transcript.text}</span>
        )}
      </div>
    </div>
  )
}
