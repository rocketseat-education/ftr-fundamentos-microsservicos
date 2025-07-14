import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWKS_ENDPOINT: z.string().url(),
});

export const env = envSchema.parse(process.env);