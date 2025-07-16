import type { FastifyInstance } from 'fastify'

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'url-shortener' }
  })
}
