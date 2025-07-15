import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AuthService } from '../services/auth.ts'
import { ConflictError } from '../lib/error-handler.ts'

export const registerUser: FastifyPluginAsyncZod = async (fastify) => {
  const authService = new AuthService()

  fastify.post(
    '/auth/register',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        }),
        response: {
          201: z.object({
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
        const result = await authService.register(request.body)
        return reply.status(201).send(result)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          throw new ConflictError('User already exists with this email')
        }
        throw error
      }
    }
  )
}