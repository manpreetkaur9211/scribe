import type { NoteState, TemplateId } from '@/types/workspace'

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'gp-note', label: 'GP Note' },
  { id: 'specialist-referral', label: 'Specialist Referral' },
  { id: 'ed-triage', label: 'ED Triage' },
]

interface TemplateSelectorProps {
  value: TemplateId
  note: NoteState
  onChange: (template: TemplateId) => void
}

export function TemplateSelector({ value, note, onChange }: TemplateSelectorProps) {
  const isDisabled = note.status === 'streaming'

  return (
    <div className="flex items-center gap-2">
      <select
        id="template-select"
        value={value}
        onChange={e => onChange(e.target.value as TemplateId)}
        disabled={isDisabled}
        className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Select note template"
      >
        {TEMPLATES.map(t => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}
