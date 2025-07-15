import type { FastifyInstance } from 'fastify'

export async function healthCheck(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'analytics' }
  })
}