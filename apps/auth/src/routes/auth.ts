import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AuthService } from '../services/auth.ts'
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../lib/error-handler.ts'

export const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const authService = new AuthService()

  // Register endpoint

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
      } catch (error: any) {
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

  // Login endpoint
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
      } catch (error: any) {
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

  // Refresh token endpoint
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

  // Logout endpoint (revoke refresh token)
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
      } catch (error: any) {
        throw error
      }
    }
  )

  // Protected profile endpoint (requires JWT validation by Kong)
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
