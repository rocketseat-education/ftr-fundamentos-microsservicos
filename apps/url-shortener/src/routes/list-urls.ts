import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { ValidationError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const listUrls: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/urls',
    {
      schema: {
        headers: z.object({
          'x-user-id': z.string(),
        }),
        querystring: z.object({
          limit: z.coerce.number().default(10),
          offset: z.coerce.number().default(0),
        }),
        response: {
          200: z.object({
            urls: z.array(
              z.object({
                id: z.string(),
                originalUrl: z.string(),
                shortCode: z.string(),
                shortUrl: z.string(),
                clickCount: z.number(),
                createdAt: z.string(),
              })
            ),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers['x-user-id']
      const { limit, offset } = request.query

      try {
        // Get total count
        const [totalResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(urls)

        const total = totalResult?.count || 0

        // Get paginated URLs
        const urlList = await db
          .select()
          .from(urls)
          .orderBy(sql`${urls.createdAt} DESC`)
          .limit(limit)
          .offset(offset)

        return reply.status(200).send({
          urls: urlList.map(url => ({
            id: url.id,
            originalUrl: url.originalUrl,
            shortCode: url.shortCode,
            shortUrl: `http://localhost:8000/${url.shortCode}`,
            clickCount: url.clickCount ?? 0,
            createdAt: url.createdAt.toISOString(),
          })),
          total,
        })
      } catch (error) {
        console.error('Error fetching user URLs:', error)
        throw new ValidationError('Failed to fetch URLs')
      }
    }
  )
}