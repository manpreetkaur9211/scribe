import type { TemplateId } from '@/types/workspace'

const S = (key: string) => `[SECTION:${key}]`

const SHARED = `You are a clinical documentation assistant. Generate a structured clinical note from the consultation transcript below. Output each section sequentially, preceded by its sentinel tag on its own line. Be concise and clinically accurate. Do not add any text before the first sentinel or after the last section.`

const sectionInstructions: Record<TemplateId, string> = {
  'gp-note': `
${S('chiefComplaint')}
Write 1-2 sentences summarising the chief complaint and duration.

${S('hpi')}
Write 3-5 sentences covering history of presenting illness: onset, character, severity, associated symptoms, relevant negatives.

${S('assessment')}
Write 1-3 sentences with the clinical assessment/differential.

${S('plan')}
Write a short bulleted plan covering investigations, treatment, and follow-up.`,

  'specialist-referral': `
${S('referralReason')}
Write 1-2 sentences stating the reason for specialist referral.

${S('clinicalHistory')}
Write 3-5 sentences summarising relevant clinical history.

${S('currentMedications')}
List current medications mentioned in the transcript.

${S('assessment')}
Write 1-2 sentences with the current clinical assessment.

${S('urgency')}
State the urgency of the referral (routine / urgent / semi-urgent) with one sentence of justification.`,

  'ed-triage': `
${S('chiefComplaint')}
Write 1-2 sentences stating the chief complaint and mechanism of injury/illness.

${S('mechanism')}
Describe the mechanism of injury or illness onset in 1-2 sentences.

${S('vitals')}
List the vital signs from the transcript.

${S('assessment')}
Write 1-2 sentences with the working diagnosis or clinical impression.

${S('disposition')}
State the recommended disposition (admit / discharge / observe / refer) with brief justification.`,
}

export function buildNotePrompt(template: TemplateId, transcript: string): string {
  return `${SHARED}

Template: ${template}

${sectionInstructions[template]}

---

TRANSCRIPT:
${transcript}`
}
