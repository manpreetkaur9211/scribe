'use client'
// uses useReducer, useRef — browser-only React hooks

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
