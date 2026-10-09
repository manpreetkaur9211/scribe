import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { getBedrockEnv } from './env'

export function getBedrockProvider() {
  const env = getBedrockEnv()
  if (!env) return null
  return createAmazonBedrock({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
  })
}
