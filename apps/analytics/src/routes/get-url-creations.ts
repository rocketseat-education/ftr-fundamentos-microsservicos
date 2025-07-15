import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { ValidationError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { urlCreations } from '../db/schema.ts'

export const getUrlCreations: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/analytics/url-creations',
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().default(10),
          offset: z.coerce.number().default(0),
        }),
        response: {
          200: z.object({
            urlCreations: z.array(
              z.object({
                id: z.string(),
                eventId: z.string(),
                urlId: z.string(),
                shortCode: z.string(),
                originalUrl: z.string(),
                userId: z.string().optional(),
                createdAt: z.string(),
                metadata: z.record(z.any()).optional(),
              })
            ),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { limit, offset } = request.query

      try {
        // Get total count
        const [totalResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(urlCreations)

        const total = totalResult?.count || 0

        // Get paginated URL creations
        const creations = await db
          .select()
          .from(urlCreations)
          .orderBy(sql`${urlCreations.createdAt} DESC`)
          .limit(limit)
          .offset(offset)

        return reply.status(200).send({
          urlCreations: creations.map(creation => ({
            id: creation.id,
            eventId: creation.eventId,
            urlId: creation.urlId,
            shortCode: creation.shortCode,
            originalUrl: creation.originalUrl,
            userId: creation.userId || undefined,
            createdAt: creation.createdAt.toISOString(),
            metadata: creation.metadata as Record<string, any> | undefined,
          })),
          total,
        })
      } catch (error) {
        console.error('Error fetching URL creations:', error)
        throw new ValidationError('Failed to fetch URL creations')
      }
    }
  )
}