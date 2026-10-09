import { describe, it, expect, vi } from 'vitest'
import { demoScripts } from '../lib/demo-scripts'
import { getSectionKeys } from '../lib/note-sections'
import { parseCompleteSections, parseFinalSection } from '../lib/parse-note-stream'
vi.mock('../lib/claude', () => ({ getBedrockProvider: vi.fn(() => null) }))
import { getBedrockProvider } from '../lib/claude'
import { POST } from '../app/api/generate-note/route'
const request = (body: unknown) => new Request('http://localhost/api/generate-note', { method: 'POST', body: JSON.stringify(body) })
describe('credential-free sample generation', () => {
  it.each(demoScripts)('streams all sections for $id without touching Bedrock', async script => {
    vi.mocked(getBedrockProvider).mockClear()
    const response = await POST(request({ mode: 'demo', transcript: script.text, template: script.defaultTemplate }))
    expect(response.status).toBe(200)
    const text = await response.text()
    const sections = parseCompleteSections(text, 0).updates
    const final = parseFinalSection(text)
    expect([...sections, final].map(section => section?.key)).toEqual(getSectionKeys(script.defaultTemplate))
    expect(getBedrockProvider).not.toHaveBeenCalled()
  })
  it('rejects partial or unrelated transcripts in demo mode', async () => {
    const response = await POST(request({ mode: 'demo', transcript: 'Some unrelated consultation', template: 'gp-note' }))
    expect(response.status).toBe(400)
  })
  it('returns a helpful unavailable response for live generation without credentials', async () => {
    const response = await POST(request({ transcript: 'Some live consultation', template: 'gp-note' }))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toContain('Run Demo')
  })
})
