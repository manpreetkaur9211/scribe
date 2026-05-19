'use client'

import { useCallback, useReducer } from 'react'
import type { AppMode, NoteState, NoteSections, TranscriptState } from '@/types/workspace'

interface WorkspaceState {
  transcript: TranscriptState
  note: NoteState
}

type WorkspaceAction =
  | { type: 'START_RECORDING' }
  | { type: 'APPEND_PARTIAL'; text: string }
  | { type: 'APPEND_FINAL'; text: string }
  | { type: 'STOP_RECORDING' }
  | { type: 'START_DEMO' }
  | { type: 'ADVANCE_DEMO_CURSOR'; word: string }
  | { type: 'FINISH_DEMO' }
  | { type: 'START_NOTE_GENERATION' }
  | { type: 'APPEND_NOTE_SECTION'; key: string; content: string }
  | { type: 'COMPLETE_NOTE' }
  | { type: 'START_EDITING' }
  | { type: 'STOP_EDITING' }
  | { type: 'UPDATE_SECTION'; key: string; content: string }
  | { type: 'SET_NOTE_ERROR'; message: string }
  | { type: 'RESET' }

function transcriptReducer(state: TranscriptState, action: WorkspaceAction): TranscriptState {
  switch (action.type) {
    case 'START_RECORDING':
      return { status: 'recording', partials: '', finals: '' }
    case 'APPEND_PARTIAL':
      if (state.status !== 'recording') return state
      return { ...state, partials: action.text }
    case 'APPEND_FINAL':
      if (state.status !== 'recording') return state
      return { ...state, finals: state.finals + action.text, partials: '' }
    case 'STOP_RECORDING':
      if (state.status !== 'recording') return state
      return { status: 'done', text: state.finals + state.partials }
    case 'START_DEMO':
      return { status: 'demo-playing', text: '', cursor: 0 }
    case 'ADVANCE_DEMO_CURSOR':
      if (state.status !== 'demo-playing') return state
      return { ...state, text: state.text + action.word, cursor: state.cursor + 1 }
    case 'FINISH_DEMO':
      if (state.status !== 'demo-playing') return state
      return { status: 'done', text: state.text }
    case 'RESET':
      return { status: 'idle' }
    default:
      return state
  }
}

function noteReducer(state: NoteState, action: WorkspaceAction): NoteState {
  switch (action.type) {
    case 'START_NOTE_GENERATION':
      return { status: 'streaming', sections: {} }
    case 'APPEND_NOTE_SECTION':
      if (state.status !== 'streaming') return state
      return {
        ...state,
        sections: { ...state.sections, [action.key]: action.content },
      }
    case 'COMPLETE_NOTE':
      if (state.status !== 'streaming') return state
      return { status: 'done', sections: state.sections as NoteSections }
    case 'START_EDITING':
      if (state.status !== 'done') return state
      return { status: 'editing', sections: state.sections }
    case 'STOP_EDITING':
      if (state.status !== 'editing') return state
      return { status: 'done', sections: state.sections }
    case 'UPDATE_SECTION':
      if (state.status !== 'editing') return state
      return {
        ...state,
        sections: { ...state.sections, [action.key]: action.content } as NoteSections,
      }
    case 'SET_NOTE_ERROR':
      return { status: 'error', message: action.message }
    case 'RESET':
      return { status: 'idle' }
    default:
      return state
  }
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  return {
    transcript: transcriptReducer(state.transcript, action),
    note: noteReducer(state.note, action),
  }
}

const INITIAL_STATE: WorkspaceState = {
  transcript: { status: 'idle' },
  note: { status: 'idle' },
}

export function useWorkspace(_mode: AppMode) {
  const [state, dispatch] = useReducer(workspaceReducer, INITIAL_STATE)

  const startRecording = useCallback(() => dispatch({ type: 'START_RECORDING' }), [])
  const appendPartial = useCallback((text: string) => dispatch({ type: 'APPEND_PARTIAL', text }), [])
  const appendFinal = useCallback((text: string) => dispatch({ type: 'APPEND_FINAL', text }), [])
  const stopRecording = useCallback(() => dispatch({ type: 'STOP_RECORDING' }), [])
  const startDemo = useCallback(() => dispatch({ type: 'START_DEMO' }), [])
  const advanceDemoCursor = useCallback((word: string) => dispatch({ type: 'ADVANCE_DEMO_CURSOR', word }), [])
  const finishDemo = useCallback(() => dispatch({ type: 'FINISH_DEMO' }), [])
  const startNoteGeneration = useCallback(() => dispatch({ type: 'START_NOTE_GENERATION' }), [])
  const appendNoteSection = useCallback((key: string, content: string) => dispatch({ type: 'APPEND_NOTE_SECTION', key, content }), [])
  const completeNote = useCallback(() => dispatch({ type: 'COMPLETE_NOTE' }), [])
  const startEditing = useCallback(() => dispatch({ type: 'START_EDITING' }), [])
  const stopEditing = useCallback(() => dispatch({ type: 'STOP_EDITING' }), [])
  const updateSection = useCallback((key: string, content: string) => dispatch({ type: 'UPDATE_SECTION', key, content }), [])
  const setNoteError = useCallback((message: string) => dispatch({ type: 'SET_NOTE_ERROR', message }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    transcript: state.transcript,
    note: state.note,
    startRecording,
    appendPartial,
    appendFinal,
    stopRecording,
    startDemo,
    advanceDemoCursor,
    finishDemo,
    startNoteGeneration,
    appendNoteSection,
    completeNote,
    startEditing,
    stopEditing,
    updateSection,
    setNoteError,
    reset,
  }
}
