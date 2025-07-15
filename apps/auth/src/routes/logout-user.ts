import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AuthService } from '../services/auth.ts'

export const logoutUser: FastifyPluginAsyncZod = async (fastify) => {
  const authService = new AuthService()

  fastify.post(
    '/auth/logout',
    {
      schema: {
        body: z.object({
          refreshToken: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        await authService.revokeRefreshToken(request.body.refreshToken)
        return reply.status(200).send({ message: 'Logged out successfully' })
      } catch (error) {
        throw error
      }
    }
  )
}