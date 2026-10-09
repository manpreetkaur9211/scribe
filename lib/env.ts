import { z } from 'zod'

const envSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
})

export function getBedrockEnv() {
  const parsed = envSchema.safeParse(process.env)
  return parsed.success ? parsed.data : null
}
