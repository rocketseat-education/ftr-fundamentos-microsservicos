import { createEnvSchema, validateEnv } from '@url-shortener/shared/core/env.ts'
import { z } from 'zod'

const urlShortenerEnvSchema = createEnvSchema({
  PORT: z.coerce.number().default(3000),
  OTEL_SERVICE_NAME: z.string().default('url-shortener'),
  JWKS_ENDPOINT: z.string().url(),
})

export const env = validateEnv(urlShortenerEnvSchema)
