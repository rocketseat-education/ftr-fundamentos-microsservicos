import { z } from 'zod'

// Base environment schema that all services can extend
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().url(),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  JWKS_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .default('http://localhost:4318/v1/traces'),
})

export type BaseEnv = z.infer<typeof baseEnvSchema>

export function createEnvSchema<T extends z.ZodRawShape>(
  serviceSpecificSchema: T
) {
  return baseEnvSchema.extend(serviceSpecificSchema)
}

export function validateEnv<T extends z.ZodSchema>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): z.infer<T> {
  const result = schema.safeParse(env)
  
  if (!result.success) {
    console.error('Environment validation failed:')
    console.error(result.error.format())
    process.exit(1)
  }
  
  return result.data
}