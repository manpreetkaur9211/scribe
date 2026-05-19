import type { AppMode } from '@/types/workspace'

interface LandingViewProps {
  onSelectMode: (mode: Exclude<AppMode, 'landing'>) => void
}

export function LandingView({ onSelectMode }: LandingViewProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Split background */}
      <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
        <div className="w-1/2 bg-[#0f172a]" />
        <div className="w-1/2 bg-[#f8fafc]" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="mb-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">Clin</span>
            <span className="text-[#7c3aed]">Scribe</span>
          </h1>
        </div>

        <p className="mb-12 text-center text-slate-400 text-lg max-w-md leading-relaxed">
          Real-time AI clinical note generation.
          <br />
          A prototype of{' '}
          <span className="text-white">Heidi&apos;s</span> core scribe workflow.
        </p>

        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => onSelectMode('live')}
            className="flex-1 flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-4 px-6 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
            aria-label="Try live mode with microphone"
          >
            <MicIcon />
            Try Live
          </button>
          <button
            onClick={() => onSelectMode('demo')}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-4 px-6 rounded-xl border border-slate-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
            aria-label="Run a pre-recorded demo consultation"
          >
            <PlayIcon />
            Run Demo
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Live mode requires microphone permission
        </p>
      </div>

      <div className="relative pb-6 text-center text-xs text-slate-500">
        Built by{' '}
        <a
          href="https://linkedin.com/in/manpreet-kaur"
          className="underline hover:text-slate-300 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manpreet Kaur
        </a>{' '}
        — applying to Heidi ·{' '}
        <a
          href="https://github.com/manpreet-kaur/clinscribe-preview"
          className="underline hover:text-slate-300 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
