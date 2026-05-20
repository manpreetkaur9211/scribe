import { render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { RecordingControls } from '../components/RecordingControls'

const noop = () => {}

afterEach(() => cleanup())

describe('RecordingControls — demo-playing state', () => {
  const demoPlayingTranscript = { status: 'demo-playing' as const, text: 'partial', cursor: 3 }
  const idleNote = { status: 'idle' as const }

  it('does not show Generate Note button while demo is playing', () => {
    render(
      <RecordingControls
        transcript={demoPlayingTranscript}
        note={idleNote}
        mode="demo"
        onStartRecording={noop}
        onStopRecording={noop}
        onCancelRecording={noop}
        onStartDemo={noop}
        onStopDemo={noop}
        onGenerateNote={noop}
        onReset={noop}
      />
    )
    expect(screen.queryByRole('button', { name: /generate note/i })).not.toBeInTheDocument()
  })

  it('shows Stop Demo button while demo is playing', () => {
    render(
      <RecordingControls
        transcript={demoPlayingTranscript}
        note={idleNote}
        mode="demo"
        onStartRecording={noop}
        onStopRecording={noop}
        onCancelRecording={noop}
        onStartDemo={noop}
        onStopDemo={noop}
        onGenerateNote={noop}
        onReset={noop}
      />
    )
    expect(screen.getByRole('button', { name: /stop demo/i })).toBeInTheDocument()
  })

  it('shows Generate Note button after demo finishes', () => {
    render(
      <RecordingControls
        transcript={{ status: 'done', text: 'full transcript' }}
        note={idleNote}
        mode="demo"
        onStartRecording={noop}
        onStopRecording={noop}
        onCancelRecording={noop}
        onStartDemo={noop}
        onStopDemo={noop}
        onGenerateNote={noop}
        onReset={noop}
      />
    )
    expect(screen.getByRole('button', { name: /generate note/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate note/i })).not.toBeDisabled()
  })
})
