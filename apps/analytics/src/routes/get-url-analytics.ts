import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ValidationError } from '../lib/error-handler.ts'

export const getUrlAnalytics: FastifyPluginAsyncZod = async (fastify) => {
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
}