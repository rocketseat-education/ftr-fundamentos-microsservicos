import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../lib/error-handler.ts'

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

      // TODO: Implement overview analytics logic
      // For now, return mock data
      const mockOverview = {
        totalUrls: 5,
        totalClicks: 125,
        totalUniqueClicks: 89,
        topUrls: [
          {
            shortCode: 'abc123',
            originalUrl: 'https://example.com',
            clicks: 45,
            uniqueClicks: 32,
            createdAt: new Date().toISOString(),
          },
          {
            shortCode: 'def456',
            originalUrl: 'https://google.com',
            clicks: 38,
            uniqueClicks: 28,
            createdAt: new Date().toISOString(),
          },
        ],
        recentClicks: [
          {
            shortCode: 'abc123',
            country: 'United States',
            city: 'New York',
            referer: 'google.com',
            clickedAt: new Date().toISOString(),
          },
          {
            shortCode: 'def456',
            country: 'Canada',
            city: 'Toronto',
            referer: 'twitter.com',
            clickedAt: new Date().toISOString(),
          },
        ],
      }

      return reply.status(200).send(mockOverview)
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
}
