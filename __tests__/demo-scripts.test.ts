import { describe, it, expect } from 'vitest'
import { demoScripts, getDemoScript, getDemoScriptByTemplate } from '../lib/demo-scripts'

describe('demo scripts', () => {
  it('exports three scripts', () => {
    expect(demoScripts).toHaveLength(3)
  })

  it('each script has id, defaultTemplate, and text with at least 100 words', () => {
    for (const script of demoScripts) {
      expect(script.id).toBeDefined()
      expect(script.defaultTemplate).toBeDefined()
      expect(script.text.split(' ').length).toBeGreaterThanOrEqual(100)
    }
  })

  it('getDemoScript returns script by id', () => {
    const script = getDemoScript('gp-chest-pain')
    expect(script.id).toBe('gp-chest-pain')
    expect(script.defaultTemplate).toBe('gp-note')
  })

  it('getDemoScript throws for unknown id', () => {
    // @ts-expect-error testing invalid input
    expect(() => getDemoScript('unknown')).toThrow()
  })

  it('getDemoScriptByTemplate returns matching script for gp-note', () => {
    const script = getDemoScriptByTemplate('gp-note')
    expect(script.defaultTemplate).toBe('gp-note')
    expect(script.id).toBe('gp-chest-pain')
  })

  it('getDemoScriptByTemplate returns matching script for specialist-referral', () => {
    const script = getDemoScriptByTemplate('specialist-referral')
    expect(script.defaultTemplate).toBe('specialist-referral')
    expect(script.id).toBe('specialist-cardio')
  })

  it('getDemoScriptByTemplate returns matching script for ed-triage', () => {
    const script = getDemoScriptByTemplate('ed-triage')
    expect(script.defaultTemplate).toBe('ed-triage')
    expect(script.id).toBe('ed-trauma')
  })

  it('getDemoScriptByTemplate falls back to gp-chest-pain for unknown template', () => {
    // @ts-expect-error testing invalid input
    const script = getDemoScriptByTemplate('unknown')
    expect(script.id).toBe('gp-chest-pain')
  })
})
