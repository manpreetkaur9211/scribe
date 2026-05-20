import type { DemoScript, DemoScriptId, TemplateId } from '@/types/workspace'

export const demoScripts: DemoScript[] = [
  {
    id: 'gp-chest-pain',
    defaultTemplate: 'gp-note',
    text: `Patient is a 45 year old male presenting with substernal chest pain for the past three days. He describes the pain as a dull pressure, rated 4 out of 10 in severity. The pain is non-radiating and does not travel to the arm or jaw. He reports the pain is relieved by antacids and worsens after large meals, particularly spicy food. He denies shortness of breath, diaphoresis, nausea, or vomiting. No history of cardiac disease, hypertension, or diabetes. He is a non-smoker and drinks alcohol occasionally. Family history is unremarkable for early cardiac disease. Current medications include occasional ibuprofen for back pain. On further questioning he reports some mild reflux symptoms over the past few weeks. He has not had any similar episodes in the past. He works as an office manager and rates his stress levels as moderate. Vital signs today are stable with blood pressure 128 over 82, heart rate 76, temperature 36.8, oxygen saturation 98 percent on room air.`,
  },
  {
    id: 'specialist-cardio',
    defaultTemplate: 'specialist-referral',
    text: `Patient is a 68 year old female presenting for cardiology follow-up six weeks post non-ST elevation myocardial infarction. She was discharged on dual antiplatelet therapy with aspirin 100 milligrams daily and ticagrelor 90 milligrams twice daily, along with atorvastatin 80 milligrams, ramipril 5 milligrams, and bisoprolol 2.5 milligrams. She reports compliance with all medications. She is experiencing mild exertional dyspnoea when climbing two flights of stairs, which is improved compared to her pre-admission baseline. She denies chest pain, orthopnoea, paroxysmal nocturnal dyspnoea, or ankle swelling. No bleeding complications from the antiplatelet therapy. She is attending cardiac rehabilitation twice weekly and finds it beneficial. She was a light smoker prior to her MI and has ceased completely since discharge. Her lipid panel from last week shows LDL of 1.8 millimoles per litre. Echocardiogram performed three weeks post discharge showed preserved ejection fraction of 55 percent with mild inferolateral hypokinesis.`,
  },
  {
    id: 'ed-trauma',
    defaultTemplate: 'ed-triage',
    text: `Patient is a 32 year old male presenting to the emergency department following a fall from a two metre ladder approximately one hour ago. He landed on his outstretched right hand. He complains of pain and swelling over the right wrist, rated 7 out of 10. He denies head strike, loss of consciousness, neck pain, or back pain. No numbness or tingling in the fingers. He is right hand dominant. Past medical history is nil significant. No regular medications and no known drug allergies. He had a tetanus booster four years ago. On examination he is alert and orientated, GCS 15. Vital signs: blood pressure 138 over 88, heart rate 92, temperature 36.6, oxygen saturation 99 percent on room air. Right wrist shows localised swelling and tenderness over the distal radius with anatomical snuffbox tenderness noted. Grip strength reduced on the right. Neurovascular examination of the hand is intact with normal capillary refill and sensation.`,
  },
]

export function getDemoScript(id: DemoScriptId): DemoScript {
  const script = demoScripts.find(s => s.id === id)
  if (!script) throw new Error(`Demo script not found: ${id}`)
  return script
}

export function getDemoScriptByTemplate(template: TemplateId): DemoScript {
  return demoScripts.find(s => s.defaultTemplate === template) ?? demoScripts[0]
}
