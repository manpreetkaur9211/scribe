export type AppMode = 'landing' | 'live' | 'demo'

export type TemplateId = 'gp-note' | 'specialist-referral' | 'ed-triage'

export type GPNoteSections = {
  chiefComplaint: string
  hpi: string
  assessment: string
  plan: string
}

export type SpecialistReferralSections = {
  referralReason: string
  clinicalHistory: string
  currentMedications: string
  assessment: string
  urgency: string
}

export type EDTriageSections = {
  chiefComplaint: string
  mechanism: string
  vitals: string
  assessment: string
  disposition: string
}

export type NoteSections = GPNoteSections | SpecialistReferralSections | EDTriageSections

export type TranscriptState =
  | { status: 'idle' }
  | { status: 'recording'; partials: string; finals: string }
  | { status: 'demo-playing'; text: string; cursor: number }
  | { status: 'done'; text: string }

export type NoteState =
  | { status: 'idle' }
  | { status: 'streaming'; sections: Partial<NoteSections> }
  | { status: 'done'; sections: NoteSections }
  | { status: 'editing'; sections: NoteSections }
  | { status: 'error'; message: string }

export type DemoScriptId = 'gp-chest-pain' | 'specialist-cardio' | 'ed-trauma'

export interface DemoScript {
  id: DemoScriptId
  defaultTemplate: TemplateId
  text: string
}

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
