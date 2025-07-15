import type { FastifyInstance } from 'fastify'

export function createHealthRoutes(serviceName: string) {
  return async function healthRoutes(fastify: FastifyInstance) {
    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', service: serviceName }
    })
  }
}