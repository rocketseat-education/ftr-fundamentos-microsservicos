import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { clicks, urlStats, processedEvents, urlCreations } from '../db/schema.ts'

export const analyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Record click event
  fastify.post(
    '/api/analytics/clicks',
    {
      schema: {
        body: z.object({
          shortCode: z.string(),
          userAgent: z.string().optional(),
          ipAddress: z.string().optional(),
          country: z.string().optional(),
          city: z.string().optional(),
          referer: z.string().optional(),
          metadata: z.record(z.any()).optional(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            shortCode: z.string(),
            clickedAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const {
        shortCode,
        userAgent,
        ipAddress,
        country,
        city,
        referer,
        metadata,
      } = request.body

      // TODO: Implement click recording logic
      // For now, return a mock response
      const mockResponse = {
        id: 'click-id',
        shortCode,
        clickedAt: new Date().toISOString(),
      }

      return reply.status(201).send(mockResponse)
    }
  )

  // Get analytics for a specific short code
  fastify.get(
    '/api/analytics/urls/:shortCode',
    {
      schema: {
        params: z.object({
          shortCode: z.string(),
        }),
        querystring: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          groupBy: z.enum(['day', 'week', 'month']).default('day'),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          200: z.object({
            shortCode: z.string(),
            totalClicks: z.number(),
            uniqueClicks: z.number(),
            analytics: z.object({
              clicksByDate: z.array(
                z.object({
                  date: z.string(),
                  clicks: z.number(),
                })
              ),
              clicksByCountry: z.array(
                z.object({
                  country: z.string(),
                  clicks: z.number(),
                })
              ),
              clicksByReferer: z.array(
                z.object({
                  referer: z.string(),
                  clicks: z.number(),
                })
              ),
              clicksByDevice: z.array(
                z.object({
                  device: z.string(),
                  clicks: z.number(),
                })
              ),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { shortCode } = request.params
      const { startDate, endDate, groupBy } = request.query
      const userId = request.headers['x-user-id']

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (start > end) {
          throw new ValidationError('Start date must be before end date')
        }
      }

      // TODO: Implement analytics retrieval logic
      // For now, return mock data
      const mockAnalytics = {
        shortCode,
        totalClicks: 25,
        uniqueClicks: 18,
        analytics: {
          clicksByDate: [
            { date: '2024-01-01', clicks: 5 },
            { date: '2024-01-02', clicks: 8 },
            { date: '2024-01-03', clicks: 12 },
          ],
          clicksByCountry: [
            { country: 'United States', clicks: 15 },
            { country: 'Canada', clicks: 7 },
            { country: 'United Kingdom', clicks: 3 },
          ],
          clicksByReferer: [
            { referer: 'direct', clicks: 10 },
            { referer: 'google.com', clicks: 8 },
            { referer: 'twitter.com', clicks: 7 },
          ],
          clicksByDevice: [
            { device: 'desktop', clicks: 15 },
            { device: 'mobile', clicks: 8 },
            { device: 'tablet', clicks: 2 },
          ],
        },
      }

      return reply.status(200).send(mockAnalytics)
    }
  )

  // Get user's analytics overview
  fastify.get(
    '/api/analytics/overview',
    {
      schema: {
        querystring: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.coerce.number().default(10),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          200: z.object({
            totalUrls: z.number(),
            totalClicks: z.number(),
            totalUniqueClicks: z.number(),
            topUrls: z.array(
              z.object({
                shortCode: z.string(),
                originalUrl: z.string(),
                clicks: z.number(),
                uniqueClicks: z.number(),
                createdAt: z.string(),
              })
            ),
            recentClicks: z.array(
              z.object({
                shortCode: z.string(),
                country: z.string().optional(),
                city: z.string().optional(),
                referer: z.string().optional(),
                clickedAt: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const { startDate, endDate, limit } = request.query
      const userId = request.headers['x-user-id']

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (start > end) {
          throw new ValidationError('Start date must be before end date')
        }
      }

      try {
        // Get total URL creations
        const [totalUrlsResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(urlCreations)
        const totalUrls = totalUrlsResult?.count || 0

        // Get total clicks
        const [totalClicksResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(clicks)
        const totalClicks = totalClicksResult?.count || 0

        // Get total unique clicks (simplified - just count distinct IP addresses)
        const [uniqueClicksResult] = await db
          .select({ count: sql<number>`count(distinct ${clicks.ipAddress})` })
          .from(clicks)
        const totalUniqueClicks = uniqueClicksResult?.count || 0

        // Get top URLs by click count
        const topUrls = await db
          .select({
            shortCode: urlStats.shortCode,
            originalUrl: urlCreations.originalUrl,
            clicks: urlStats.totalClicks,
            uniqueClicks: urlStats.uniqueClicks,
            createdAt: urlCreations.createdAt,
          })
          .from(urlStats)
          .leftJoin(urlCreations, eq(urlStats.shortCode, urlCreations.shortCode))
          .orderBy(sql`${urlStats.totalClicks} DESC`)
          .limit(limit)

        // Get recent clicks
        const recentClicks = await db
          .select({
            shortCode: clicks.shortCode,
            country: clicks.country,
            city: clicks.city,
            referer: clicks.referer,
            clickedAt: clicks.clickedAt,
          })
          .from(clicks)
          .orderBy(sql`${clicks.clickedAt} DESC`)
          .limit(limit)

        return reply.status(200).send({
          totalUrls,
          totalClicks,
          totalUniqueClicks,
          topUrls: topUrls.map(url => ({
            shortCode: url.shortCode,
            originalUrl: url.originalUrl || '',
            clicks: url.clicks || 0,
            uniqueClicks: url.uniqueClicks || 0,
            createdAt: url.createdAt?.toISOString() || '',
          })),
          recentClicks: recentClicks.map(click => ({
            shortCode: click.shortCode,
            country: click.country || undefined,
            city: click.city || undefined,
            referer: click.referer || undefined,
            clickedAt: click.clickedAt.toISOString(),
          })),
        })
      } catch (error) {
        console.error('Error fetching analytics overview:', error)
        throw new ValidationError('Failed to fetch analytics overview')
      }
    }
  )

  // Get real-time analytics
  fastify.get(
    '/api/analytics/realtime',
    {
      schema: {
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          200: z.object({
            activeUsers: z.number(),
            clicksLastHour: z.number(),
            clicksLast24Hours: z.number(),
            topActiveUrls: z.array(
              z.object({
                shortCode: z.string(),
                originalUrl: z.string(),
                recentClicks: z.number(),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers['x-user-id']

      // TODO: Implement real-time analytics logic
      // For now, return mock data
      const mockRealtime = {
        activeUsers: 3,
        clicksLastHour: 12,
        clicksLast24Hours: 87,
        topActiveUrls: [
          {
            shortCode: 'abc123',
            originalUrl: 'https://example.com',
            recentClicks: 8,
          },
          {
            shortCode: 'def456',
            originalUrl: 'https://google.com',
            recentClicks: 4,
          },
        ],
      }

      return reply.status(200).send(mockRealtime)
    }
  )

  // Export analytics data
  fastify.get(
    '/api/analytics/export',
    {
      schema: {
        querystring: z.object({
          format: z.enum(['csv', 'json']).default('csv'),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          shortCode: z.string().optional(),
        }),
        headers: z.object({
          'x-user-id': z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { format, startDate, endDate, shortCode } = request.query
      const userId = request.headers['x-user-id']

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (start > end) {
          throw new ValidationError('Start date must be before end date')
        }
      }

      // TODO: Implement export logic
      // For now, return mock data
      if (format === 'csv') {
        const csvData =
          'shortCode,originalUrl,clicks,uniqueClicks,createdAt\nabc123,https://example.com,45,32,2024-01-01T00:00:00.000Z\ndef456,https://google.com,38,28,2024-01-02T00:00:00.000Z'

        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', 'attachment; filename="analytics.csv"')
          .send(csvData)
      }
      const jsonData = {
        urls: [
          {
            shortCode: 'abc123',
            originalUrl: 'https://example.com',
            clicks: 45,
            uniqueClicks: 32,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            shortCode: 'def456',
            originalUrl: 'https://google.com',
            clicks: 38,
            uniqueClicks: 28,
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      }

      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', 'attachment; filename="analytics.json"')
        .send(jsonData)
    }
  )

  // Get URL creation events (to demonstrate idempotency)
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

  // Get processed events (to demonstrate idempotency tracking)
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
