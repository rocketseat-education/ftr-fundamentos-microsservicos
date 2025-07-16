import type { FastifyInstance } from 'fastify'
import { healthCheck } from './health-check.ts'
import { recordClick } from './record-click.ts'
import { getUrlAnalytics } from './get-url-analytics.ts'
import { getAnalyticsOverview } from './get-analytics-overview.ts'
import { getRealtimeAnalytics } from './get-realtime-analytics.ts'
import { exportAnalytics } from './export-analytics.ts'
import { getUrlCreations } from './get-url-creations.ts'
import { getProcessedEvents } from './get-processed-events.ts'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register core business logic routes
  await fastify.register(healthCheck)
  await fastify.register(recordClick)
  await fastify.register(getUrlAnalytics)
  await fastify.register(getAnalyticsOverview)
  await fastify.register(getRealtimeAnalytics)
  await fastify.register(exportAnalytics)
  await fastify.register(getUrlCreations)
  await fastify.register(getProcessedEvents)
  
  // SAGA operations are now handled via Kafka consumers
  // No need for HTTP endpoints for SAGA steps
}
