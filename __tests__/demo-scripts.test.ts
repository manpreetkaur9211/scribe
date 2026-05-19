import { describe, it, expect } from 'vitest'
import { demoScripts, getDemoScript } from '../lib/demo-scripts'

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
})
