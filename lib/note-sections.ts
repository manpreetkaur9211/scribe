import type { TemplateId } from '@/types/workspace'

export const SECTION_LABELS: Record<TemplateId, Record<string, string>> = {
  'gp-note': {
    chiefComplaint: 'Chief Complaint',
    hpi: 'History of Presenting Illness',
    assessment: 'Assessment',
    plan: 'Plan',
  },
  'specialist-referral': {
    referralReason: 'Reason for Referral',
    clinicalHistory: 'Clinical History',
    currentMedications: 'Current Medications',
    assessment: 'Assessment',
    urgency: 'Urgency',
  },
  'ed-triage': {
    chiefComplaint: 'Chief Complaint',
    mechanism: 'Mechanism',
    vitals: 'Vitals',
    assessment: 'Assessment',
    disposition: 'Disposition',
  },
}

export function getSectionKeys(template: TemplateId): string[] {
  return Object.keys(SECTION_LABELS[template])
}
