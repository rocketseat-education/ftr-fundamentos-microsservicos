import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { NotFoundError, ValidationError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const updateUrl: FastifyPluginAsyncZod = async (fastify) => {
  fastify.put(
    '/api/urls/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          url: z.string().url(),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            originalUrl: z.string(),
            shortCode: z.string(),
            shortUrl: z.string(),
            clickCount: z.number(),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { url } = request.body
      const userId = request.headers['x-user-id']

      try {
        // Validate URL format
        new URL(url)
      } catch (error) {
        throw new ValidationError('Invalid URL format')
      }

      try {
        // Update URL in database
        const [updatedUrl] = await db
          .update(urls)
          .set({ originalUrl: url })
          .where(eq(urls.id, id))
          .returning()

        if (!updatedUrl) {
          throw new NotFoundError('URL not found')
        }

        return reply.status(200).send({
          id: updatedUrl.id,
          originalUrl: updatedUrl.originalUrl,
          shortCode: updatedUrl.shortCode,
          shortUrl: `http://localhost:8000/${updatedUrl.shortCode}`,
          clickCount: updatedUrl.clickCount ?? 0,
          createdAt: updatedUrl.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error
        }
        console.error('Error updating URL:', error)
        throw new ValidationError('Failed to update URL')
      }
    }
  )
}