import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toDataStreamResponse: () =>
      new Response('stream', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
  }),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: () => () => 'mocked-model',
}))

describe('POST /api/generate-note', () => {
  it('returns 400 when transcript is missing', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'gp-note' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when template is invalid', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Patient has chest pain', template: 'bad-template' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when transcript is too short', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'short', template: 'gp-note' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('calls streamText and returns stream response for valid input', async () => {
    const { POST } = await import('../app/api/generate-note/route')
    const { streamText } = await import('ai')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Patient is a 45 year old male with chest pain for 3 days',
        template: 'gp-note',
      }),
    })
    const res = await POST(req)
    expect(streamText).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })
})
