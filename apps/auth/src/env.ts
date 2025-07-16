import { createEnvSchema, validateEnv } from '@url-shortener/shared/core/env.ts'
import { z } from 'zod'

const authEnvSchema = createEnvSchema({
  PORT: z.coerce.number().default(3002),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('url-shortener-auth'),
  JWT_AUDIENCE: z.string().default('url-shortener-api'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
})

export const env = validateEnv(authEnvSchema)
