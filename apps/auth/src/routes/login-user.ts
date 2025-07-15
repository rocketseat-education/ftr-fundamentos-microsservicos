import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AuthService } from '../services/auth.ts'
import { AuthenticationError } from '../lib/error-handler.ts'

export const loginUser: FastifyPluginAsyncZod = async (fastify) => {
  const authService = new AuthService()

  fastify.post(
    '/auth/login',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              firstName: z.string().optional(),
              lastName: z.string().optional(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await authService.login(request.body)
        return reply.status(200).send(result)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Invalid credentials')
        ) {
          throw new AuthenticationError('Invalid credentials')
        }
        if (error instanceof Error && error.message.includes('disabled')) {
          throw new AuthenticationError('User account is disabled')
        }
        throw error
      }
    }
  )
}