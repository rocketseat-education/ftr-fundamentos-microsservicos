import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { NotFoundError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const getUrl: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/api/urls/:shortCode',
    {
      schema: {
        params: z.object({
          shortCode: z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            originalUrl: z.string(),
            shortCode: z.string(),
            shortUrl: z.string(),
            clickCount: z.number(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { shortCode } = request.params

      try {
        const [url] = await db
          .select()
          .from(urls)
          .where(eq(urls.shortCode, shortCode))
          .limit(1)

        if (!url) {
          throw new NotFoundError('Short URL not found')
        }

        return reply.status(200).send({
          id: url.id,
          originalUrl: url.originalUrl,
          shortCode: url.shortCode,
          shortUrl: `http://localhost:8000/${url.shortCode}`,
          clickCount: url.clickCount ?? 0,
          createdAt: url.createdAt.toISOString(),
        })
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error
        }
        console.error('Error fetching URL:', error)
        throw new NotFoundError('Short URL not found')
      }
    }
  )
}