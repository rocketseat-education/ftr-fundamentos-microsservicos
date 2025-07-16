import type { FastifyInstance } from 'fastify'
import { healthCheck } from './health-check.ts'
import { createUrl } from './create-url.ts'
import { getUrl } from './get-url.ts'
import { listUrls } from './list-urls.ts'
import { updateUrl } from './update-url.ts'
import { deleteUrl } from './delete-url.ts'
import { redirectUrl } from './redirect-url.ts'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register core business logic routes
  await fastify.register(healthCheck)
  await fastify.register(createUrl)
  await fastify.register(getUrl)
  await fastify.register(listUrls)
  await fastify.register(updateUrl)
  await fastify.register(deleteUrl)
  await fastify.register(redirectUrl)
  
  // SAGA operations are now handled via Kafka consumers
  // No need for HTTP endpoints for SAGA steps
}
