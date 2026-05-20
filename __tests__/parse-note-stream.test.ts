import { describe, it, expect } from 'vitest'
import { parseCompleteSections, parseFinalSection } from '../lib/parse-note-stream'

describe('parseCompleteSections', () => {
  it('returns nothing when buffer has only one section (no following sentinel)', () => {
    const buffer = '[SECTION:chiefComplaint]Chest pain for 3 days'
    const { updates, newOffset } = parseCompleteSections(buffer, 0)
    expect(updates).toHaveLength(0)
    expect(newOffset).toBe(0)
  })

  it('dispatches first section when second sentinel arrives', () => {
    const buffer = '[SECTION:chiefComplaint]Chest pain[SECTION:hpi]Started Monday'
    const { updates, newOffset } = parseCompleteSections(buffer, 0)
    expect(updates).toHaveLength(1)
    expect(updates[0]).toEqual({ key: 'chiefComplaint', content: 'Chest pain' })
    expect(newOffset).toBeGreaterThan(0)
  })

  it('dispatches two complete sections with three sentinels', () => {
    const buffer =
      '[SECTION:chiefComplaint]Chest pain[SECTION:hpi]Started Monday[SECTION:assessment]Likely GERD'
    const { updates } = parseCompleteSections(buffer, 0)
    expect(updates).toHaveLength(2)
    expect(updates[0].key).toBe('chiefComplaint')
    expect(updates[1].key).toBe('hpi')
  })

  it('does not re-dispatch already-processed sections when called with an offset', () => {
    const buffer =
      '[SECTION:chiefComplaint]Chest pain[SECTION:hpi]Started Monday[SECTION:assessment]Likely GERD'
    const { updates: first, newOffset } = parseCompleteSections(buffer, 0)
    expect(first).toHaveLength(2)

    const buffer2 = buffer + '[SECTION:plan]Antacids'
    const { updates: second } = parseCompleteSections(buffer2, newOffset)
    expect(second).toHaveLength(1)
    expect(second[0].key).toBe('assessment')
  })

  it('trims whitespace from section content', () => {
    const buffer = '[SECTION:chiefComplaint]  Chest pain  \n[SECTION:hpi]Started'
    const { updates } = parseCompleteSections(buffer, 0)
    expect(updates[0].content).toBe('Chest pain')
  })
})

describe('parseFinalSection', () => {
  it('returns null for empty buffer', () => {
    expect(parseFinalSection('')).toBeNull()
  })

  it('returns the last section in a multi-section buffer', () => {
    const buffer =
      '[SECTION:chiefComplaint]Chest pain[SECTION:hpi]Started Monday[SECTION:plan]Antacids daily'
    const result = parseFinalSection(buffer)
    expect(result).not.toBeNull()
    expect(result?.key).toBe('plan')
    expect(result?.content).toBe('Antacids daily')
  })

  it('returns the only section in a single-section buffer', () => {
    const buffer = '[SECTION:chiefComplaint]Chest pain for 3 days'
    const result = parseFinalSection(buffer)
    expect(result?.key).toBe('chiefComplaint')
    expect(result?.content).toBe('Chest pain for 3 days')
  })

  it('trims trailing whitespace from final section content', () => {
    const buffer = '[SECTION:plan]Antacids daily  \n  '
    const result = parseFinalSection(buffer)
    expect(result?.content).toBe('Antacids daily')
  })
})
