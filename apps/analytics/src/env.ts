import { createEnvSchema, validateEnv } from '@url-shortener/shared/core/env.ts'
import { z } from 'zod'

const analyticsEnvSchema = createEnvSchema({
  PORT: z.coerce.number().default(3001),
})

export const env = validateEnv(analyticsEnvSchema)
