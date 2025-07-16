import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AuthService } from '../services/auth.ts'
import { NotFoundError } from '../lib/error-handler.ts'

export const getUserProfile: FastifyPluginAsyncZod = async (fastify) => {
  const authService = new AuthService()

  fastify.get(
    '/auth/profile',
    {
      schema: {
        headers: z.object({
          'x-user-id': z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            isActive: z.boolean(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        // Kong will inject the user ID from the JWT token
        const userId = request.headers['x-user-id']
        const user = await authService.getUserProfile(userId)

        return reply.status(200).send({
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          isActive: user.isActive ?? false,
          createdAt: user.createdAt.toISOString(),
        })
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new NotFoundError('User not found')
        }
        throw error
      }
    }
  )
}