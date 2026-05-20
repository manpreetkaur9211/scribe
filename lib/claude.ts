import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { env } from './env'

export const anthropic = createAmazonBedrock({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
})
