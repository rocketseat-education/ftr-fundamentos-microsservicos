import type { FastifyInstance } from 'fastify'
import { analyticsRoutes } from './analytics.ts'
import { healthRoutes } from './health.ts'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(healthRoutes)
  await fastify.register(analyticsRoutes)
}
