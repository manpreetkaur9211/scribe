import { z } from 'zod'

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(
    `Missing required environment variables:\n${parsed.error.issues.map(i => i.message).join('\n')}`
  )
}

export const env = parsed.data
