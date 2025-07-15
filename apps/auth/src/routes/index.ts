import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.ts'
import { jwksRoutes } from './jwks.ts'
import { authRoutes } from './auth.ts'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(healthRoutes)
  await fastify.register(jwksRoutes)
  await fastify.register(authRoutes)
}
