import { z } from 'zod'

const envSchema = z.object({
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
  // OpenTelemetry standard environment variables (optional, with defaults)
  OTEL_SERVICE_NAME: z.string().default('auth'),
  OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .default('http://localhost:4318/v1/traces'),
})

export const env = envSchema.parse(process.env)
