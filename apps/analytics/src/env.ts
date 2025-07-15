import { createEnvSchema, validateEnv } from '@microservices/shared/core/env.ts'
import { z } from 'zod'

const analyticsEnvSchema = createEnvSchema({
  PORT: z.coerce.number().default(3001),
  OTEL_SERVICE_NAME: z.string().default('analytics'),
})

export const env = validateEnv(analyticsEnvSchema)
