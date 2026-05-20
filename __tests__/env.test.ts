import { describe, it, expect, afterEach, vi } from 'vitest'

describe('env validation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws when AWS_ACCESS_KEY_ID is missing', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', '')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'secret')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    await expect(import('../lib/env')).rejects.toThrow('AWS_ACCESS_KEY_ID')
  })

  it('throws when AWS_SECRET_ACCESS_KEY is missing', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIAIOSFODNN7EXAMPLE')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', '')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    await expect(import('../lib/env')).rejects.toThrow('AWS_SECRET_ACCESS_KEY')
  })

  it('throws when AWS_REGION is missing', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIAIOSFODNN7EXAMPLE')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'secret')
    vi.stubEnv('AWS_REGION', '')
    await expect(import('../lib/env')).rejects.toThrow('AWS_REGION')
  })

  it('returns validated env when all AWS vars are present', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'AKIAIOSFODNN7EXAMPLE')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    const { env } = await import('../lib/env')
    expect(env.AWS_ACCESS_KEY_ID).toBe('AKIAIOSFODNN7EXAMPLE')
    expect(env.AWS_SECRET_ACCESS_KEY).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    expect(env.AWS_REGION).toBe('us-east-1')
  })
})
