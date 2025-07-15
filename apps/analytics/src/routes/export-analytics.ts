import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ValidationError } from '../lib/error-handler.ts'

export const exportAnalytics: FastifyPluginAsyncZod = async (fastify) => {
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