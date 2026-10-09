import type { TemplateId } from '@/types/workspace'
import { getSectionKeys } from './note-sections'

// Prepared notes describe only the complete fictional sample consultations.
export const demoNotes: Record<TemplateId, Record<string, string>> = {
  'gp-note': {
    chiefComplaint: '45-year-old man with three days of substernal chest pressure, rated 4/10.',
    hpi: 'Non-radiating discomfort worsens after large or spicy meals and improves with antacids. Mild reflux symptoms over recent weeks. No dyspnoea, diaphoresis, nausea or vomiting. No known cardiac disease, hypertension or diabetes; non-smoker. Occasional ibuprofen for back pain. BP 128/82, HR 76, temperature 36.8°C and SpO₂ 98% on room air.',
    assessment: 'Reflux-related discomfort is a possible explanation. The transcript does not establish a diagnosis or document exclusion of cardiac causes.',
    plan: 'Investigations, treatment and follow-up were not specified in the sample transcript.',
  },
  'specialist-referral': {
    referralReason: 'Cardiology follow-up six weeks after NSTEMI in a 68-year-old woman.',
    clinicalHistory: 'Mild exertional dyspnoea on climbing two flights of stairs, improved from the pre-admission baseline. No chest pain, orthopnoea, PND, ankle swelling or bleeding complications. Adherent to medications and attends cardiac rehabilitation twice weekly. Stopped smoking after the MI. LDL 1.8 mmol/L; echocardiogram showed EF 55% with mild inferolateral hypokinesis.',
    currentMedications: 'Aspirin 100 mg daily; ticagrelor 90 mg twice daily; atorvastatin 80 mg; ramipril 5 mg; bisoprolol 2.5 mg. Frequency of the last three medications was not specified.',
    assessment: 'Post-NSTEMI follow-up with preserved ejection fraction and improving exertional symptoms.',
    urgency: 'Referral urgency was not explicitly stated in the sample transcript.',
  },
  'ed-triage': {
    chiefComplaint: '32-year-old man with right wrist pain and swelling after a fall, rated 7/10.',
    mechanism: 'Fell approximately two metres from a ladder one hour before presentation, landing on the outstretched right hand. No head strike, loss of consciousness, neck or back pain.',
    vitals: 'BP 138/88; HR 92; temperature 36.6°C; SpO₂ 99% on room air; GCS 15.',
    assessment: 'Right wrist injury with distal radius and anatomical snuffbox tenderness and reduced grip strength. Possible fracture; no imaging result was provided. Hand neurovascular examination is intact.',
    disposition: 'Disposition was not specified in the sample transcript.',
  },
}

export function streamDemoNote(template: TemplateId, signal: AbortSignal): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const key of getSectionKeys(template)) {
          if (signal.aborted) break
          controller.enqueue(encoder.encode(`[SECTION:${key}]\n${demoNotes[template][key]}\n\n`))
          await new Promise(resolve => setTimeout(resolve, 180))
        }
        controller.close()
      } catch {
        // The reader may have cancelled the stream.
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
