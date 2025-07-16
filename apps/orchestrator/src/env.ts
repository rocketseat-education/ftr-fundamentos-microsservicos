import { createEnvSchema, validateEnv } from '@url-shortener/shared/core/env.ts'
import { z } from 'zod'

const orchestratorEnvSchema = createEnvSchema({
  PORT: z.coerce.number().default(3003),
  OTEL_SERVICE_NAME: z.string().default('orchestrator'),
})

export const env = validateEnv(orchestratorEnvSchema)