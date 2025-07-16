import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '../env.ts'
import * as schema from './schema.ts'

export const db = drizzle(env.DATABASE_URL, { schema })
