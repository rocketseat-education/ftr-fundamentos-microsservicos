import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AuthService } from '../services/auth.ts'
import { AuthenticationError } from '../lib/error-handler.ts'

export const refreshToken: FastifyPluginAsyncZod = async (fastify) => {
  const authService = new AuthService()

  fastify.post(
    '/auth/refresh',
    {
      schema: {
        body: z.object({
          refreshToken: z.string(),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await authService.refreshAccessToken(
          request.body.refreshToken
        )
        return reply.status(200).send(result)
      } catch (error: any) {
        if (
          (error instanceof Error && error.message.includes('Invalid')) ||
          (error instanceof Error && error.message.includes('expired'))
        ) {
          throw new AuthenticationError('Invalid or expired refresh token')
        }
        throw error
      }
    }
  )
}