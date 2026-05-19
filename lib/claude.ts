import { createAnthropic } from '@ai-sdk/anthropic'
import { env } from './env'

export const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY,
})
