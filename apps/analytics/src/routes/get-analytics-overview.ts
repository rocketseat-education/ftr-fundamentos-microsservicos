import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { ValidationError } from '../lib/error-handler.ts'
import { db } from '../db/connection.ts'
import { clicks, urlStats, urlCreations } from '../db/schema.ts'

export const getAnalyticsOverview: FastifyPluginAsyncZod = async (fastify) => {
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
}