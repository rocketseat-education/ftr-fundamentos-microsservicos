import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { NotFoundError } from '../lib/error-handler.ts'
import { publishClickEvent } from '../lib/kafka/producers/index.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const redirectUrl: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/:shortCode',
    {
      schema: {
        params: z.object({
          shortCode: z.string(),
        }),
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

        // Increment click count
        await db
          .update(urls)
          .set({ clickCount: sql`${urls.clickCount} + 1` })
          .where(eq(urls.shortCode, shortCode))

        // Publish click event to Kafka (fire-and-forget)
        publishClickEvent({
          shortCode,
          originalUrl: url.originalUrl,
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
          country: Array.isArray(request.headers['cf-ipcountry'])
            ? request.headers['cf-ipcountry'][0]
            : request.headers['cf-ipcountry'],
          city: Array.isArray(request.headers['cf-ipcity'])
            ? request.headers['cf-ipcity'][0]
            : request.headers['cf-ipcity'],
          referer: request.headers.referer,
          timestamp: new Date().toISOString(),
          userId: Array.isArray(request.headers['x-user-id'])
            ? request.headers['x-user-id'][0]
            : request.headers['x-user-id'],
          metadata: {
            host: request.headers.host,
            acceptLanguage: request.headers['accept-language'],
          },
        }).catch((error) => {
          console.error('Failed to publish click event:', error)
          // In production, you might want to send this to a monitoring service
        })

        return reply.status(301).redirect(url.originalUrl)
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error
        }
        console.error('Error processing redirect:', error)
        throw new NotFoundError('Short URL not found')
      }
    }
  )
}