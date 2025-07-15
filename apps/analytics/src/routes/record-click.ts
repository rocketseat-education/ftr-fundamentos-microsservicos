import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const recordClick: FastifyPluginAsyncZod = async (fastify) => {
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
}