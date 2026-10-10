'use client'
// owns the top-level mode state (landing / live / demo) — must be interactive

import { useState } from 'react'
import { LandingView } from './LandingView'
import { Workspace } from './Workspace'
import type { AppMode } from '@/types/workspace'

export function AppShell({ liveAvailable }: { liveAvailable: boolean }) {
  const [mode, setMode] = useState<AppMode>('landing')

  return (
    <div className="min-h-screen">
      {mode === 'landing' ? (
        <LandingView liveAvailable={liveAvailable} onSelectMode={setMode} />
      ) : (
        <Workspace mode={mode} onHome={() => setMode('landing')} />
      )}
    </div>
  )
}
