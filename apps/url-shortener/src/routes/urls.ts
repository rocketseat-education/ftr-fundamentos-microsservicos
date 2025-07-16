import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { eq, sql } from 'drizzle-orm'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../lib/error-handler.ts'
import { publishClickEvent, publishUrlCreatedEvent } from '../lib/kafka/events/produced.ts'
import { db } from '../db/connection.ts'
import { urls } from '../db/schema.ts'

export const urlRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Create short URL endpoint
  fastify.post(
    '/api/urls',
    {
      schema: {
        body: z.object({
          url: z.string().url(),
          customCode: z.string().optional(),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          201: z.object({
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
      const { url, customCode } = request.body
      const userId = request.headers['x-user-id']

      try {
        // Validate URL format
        new URL(url)
      } catch (error) {
        throw new ValidationError('Invalid URL format')
      }

      const urlId = createId()
      const shortCode = customCode || createId().slice(0, 8)
      
      try {
        // Check if custom code already exists
        if (customCode) {
          const existingUrl = await db
            .select()
            .from(urls)
            .where(eq(urls.shortCode, customCode))
            .limit(1)
          
          if (existingUrl.length > 0) {
            throw new ConflictError('Custom short code already exists')
          }
        }

        // Insert new URL into database
        const [createdUrl] = await db
          .insert(urls)
          .values({
            id: urlId,
            originalUrl: url,
            shortCode,
            clickCount: 0,
          })
          .returning()

        // Publish URL creation event to Kafka (fire-and-forget)
        publishUrlCreatedEvent({
          eventId: createId(),
          urlId: createdUrl.id,
          shortCode: createdUrl.shortCode,
          originalUrl: createdUrl.originalUrl,
          userId,
          createdAt: createdUrl.createdAt.toISOString(),
          metadata: {
            host: request.headers.host,
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
          },
        }).catch((error) => {
          console.error('Failed to publish URL creation event:', error)
          // In production, you might want to send this to a monitoring service
        })

        return reply.status(201).send({
          id: createdUrl.id,
          originalUrl: createdUrl.originalUrl,
          shortCode: createdUrl.shortCode,
          shortUrl: `http://localhost:8000/${createdUrl.shortCode}`,
          clickCount: createdUrl.clickCount ?? 0,
          createdAt: createdUrl.createdAt.toISOString(),
        })
      } catch (error) {
        if (error instanceof ConflictError) {
          throw error
        }
        console.error('Error creating URL:', error)
        throw new ValidationError('Failed to create short URL')
      }
    }
  )

  // Get URL by short code
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

  // Redirect endpoint
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

  // Get user's URLs
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

  // Update URL
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

  // Delete URL
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
