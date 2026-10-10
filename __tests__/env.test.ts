import { describe, it, expect, afterEach, vi } from 'vitest'
import { getBedrockEnv, isLiveAiEnabled } from '../lib/env'
describe('optional Bedrock credentials', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('returns null without credentials instead of throwing at import', () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', '')
    expect(getBedrockEnv()).toBeNull()
  })
  it('validates complete credentials on demand', () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    expect(getBedrockEnv()?.AWS_REGION).toBe('us-east-1')
  })
  it('requires explicit live enablement as well as complete credentials', () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret')
    vi.stubEnv('AWS_REGION', 'us-east-1')
    vi.stubEnv('LIVE_AI_ENABLED', '')
    expect(isLiveAiEnabled()).toBe(false)
    vi.stubEnv('LIVE_AI_ENABLED', 'true')
    expect(isLiveAiEnabled()).toBe(true)
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', '')
    expect(isLiveAiEnabled()).toBe(false)
  })
})
