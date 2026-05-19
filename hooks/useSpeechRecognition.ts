'use client'

import { useCallback, useEffect, useRef } from 'react'

interface SpeechRecognitionOptions {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (error: string) => void
}

export function useSpeechRecognition({ onPartial, onFinal, onError }: SpeechRecognitionOptions) {
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)

  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : null

  const isSupported = SpeechRecognitionClass != null

  useEffect(() => {
    if (!SpeechRecognitionClass) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-AU'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex]
      const text = result[0].transcript
      if (result.isFinal) {
        onFinal(text)
      } else {
        onPartial(text)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError(event.error)
    }

    recognitionRef.current = recognition
    return () => recognition.abort()
    // callbacks are stable refs — no need to re-run effect on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(() => recognitionRef.current?.start(), [])
  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  return { isSupported, start, stop }
}
