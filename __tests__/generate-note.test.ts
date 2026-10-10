import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/env', () => ({
  isLiveAiEnabled: () => true,
  getBedrockEnv: () => ({
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    AWS_REGION: 'us-east-1',
  }),
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    toTextStreamResponse: () =>
      new Response('stream', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
  }),
}))

vi.mock('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: () => () => 'mocked-model',
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

describe('POST /api/generate-note — model error', () => {
  it('returns 502 with JSON error when streamText throws', async () => {
    const { streamText } = await import('ai')
    vi.mocked(streamText).mockRejectedValueOnce(new Error('Bedrock throttled'))

    const { POST } = await import('../app/api/generate-note/route')
    const req = new Request('http://localhost/api/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Patient is a 45 year old male with chest pain for 3 days',
        template: 'gp-note',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('Live AI generation failed')
  })
})
