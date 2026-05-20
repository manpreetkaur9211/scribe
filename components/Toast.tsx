'use client'
// renders interactive dismiss buttons — requires browser DOM

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
