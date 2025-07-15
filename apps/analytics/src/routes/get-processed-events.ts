import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { ValidationError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { processedEvents } from '../db/schema.ts'

export const getProcessedEvents: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/analytics/processed-events',
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().default(10),
          offset: z.coerce.number().default(0),
          eventType: z.string().optional(),
        }),
        response: {
          200: z.object({
            processedEvents: z.array(
              z.object({
                eventId: z.string(),
                eventType: z.string(),
                processedAt: z.string(),
                ttlExpiresAt: z.string().optional(),
              })
            ),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { limit, offset, eventType } = request.query

      try {
        // Build query with optional event type filter
        const baseQuery = db.select().from(processedEvents)
        const query = eventType 
          ? baseQuery.where(eq(processedEvents.eventType, eventType))
          : baseQuery

        // Get total count
        const countQuery = eventType
          ? db.select({ count: sql<number>`count(*)` }).from(processedEvents).where(eq(processedEvents.eventType, eventType))
          : db.select({ count: sql<number>`count(*)` }).from(processedEvents)

        const [totalResult] = await countQuery
        const total = totalResult?.count || 0

        // Get paginated processed events
        const events = await query
          .orderBy(sql`${processedEvents.processedAt} DESC`)
          .limit(limit)
          .offset(offset)

        return reply.status(200).send({
          processedEvents: events.map(event => ({
            eventId: event.eventId,
            eventType: event.eventType,
            processedAt: event.processedAt.toISOString(),
            ttlExpiresAt: event.ttlExpiresAt?.toISOString(),
          })),
          total,
        })
      } catch (error) {
        console.error('Error fetching processed events:', error)
        throw new ValidationError('Failed to fetch processed events')
      }
    }
  )
}