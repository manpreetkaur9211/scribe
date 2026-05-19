import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test' },
}))

describe('GET /api/demo-transcript', () => {
  it('returns 400 for missing script param', async () => {
    const { GET } = await import('../app/api/demo-transcript/route')
    const req = new Request('http://localhost/api/demo-transcript')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 for invalid script param', async () => {
    const { GET } = await import('../app/api/demo-transcript/route')
    const req = new Request('http://localhost/api/demo-transcript?script=invalid')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 SSE stream for valid script', async () => {
    const { GET } = await import('../app/api/demo-transcript/route')
    const req = new Request('http://localhost/api/demo-transcript?script=gp-chest-pain')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
