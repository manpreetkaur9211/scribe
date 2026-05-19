import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    await expect(import('../lib/env')).rejects.toThrow('ANTHROPIC_API_KEY')
  })

  it('returns validated env when ANTHROPIC_API_KEY is present', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key')
    const { env } = await import('../lib/env')
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-test-key')
  })
})
