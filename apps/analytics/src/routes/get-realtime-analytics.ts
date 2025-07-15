import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const getRealtimeAnalytics: FastifyPluginAsyncZod = async (fastify) => {
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
}