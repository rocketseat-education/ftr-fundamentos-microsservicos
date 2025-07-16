import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { NotFoundError, ValidationError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const deleteUrl: FastifyPluginAsyncZod = async (fastify) => {
  fastify.delete(
    '/api/urls/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params

      try {
        const [deletedUrl] = await db
          .delete(urls)
          .where(eq(urls.id, id))
          .returning()

        if (!deletedUrl) {
          throw new NotFoundError('URL not found')
        }

        return reply.status(204).send()
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error
        }
        console.error('Error deleting URL:', error)
        throw new ValidationError('Failed to delete URL')
      }
    }
  )
}