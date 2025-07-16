import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '../db/connection.ts'
import { users } from '../db/schema.ts'
import { eq, and, isNull } from 'drizzle-orm'
import { authOrchestrationService } from '../lib/orchestration.ts'

const deleteUserParamsSchema = z.object({
  userId: z.string().describe('User ID to delete'),
})

const deleteUserResponseSchema = z.object({
  success: z.boolean().describe('Whether the deletion was initiated'),
  sagaId: z.string().describe('SAGA instance ID for tracking'),
  message: z.string().describe('Status message')
})

export const deleteUser: FastifyPluginAsyncZod = async (fastify) => {
  fastify.delete(
    '/users/:userId',
    {
      schema: {
        params: deleteUserParamsSchema,
        response: {
          200: deleteUserResponseSchema,
          404: z.object({
            error: z.string(),
            message: z.string()
          }),
          500: z.object({
            error: z.string(),
            message: z.string()
          })
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params

      try {
        // Check if user exists and is not already deleted
        const existingUser = await db
          .select()
          .from(users)
          .where(and(eq(users.id, userId), isNull(users.deletedAt)))
          .limit(1)

        if (existingUser.length === 0) {
          return reply.status(400).send({
            error: 'USER_NOT_FOUND',
            message: 'User not found or already deleted'
          })
        }

        // Request user deletion orchestration
        const sagaId = await authOrchestrationService.requestUserDeletion(userId)
        
        return reply.status(200).send({
          success: true,
          sagaId,
          message: `User deletion orchestration started for user ${userId}`
        })
      } catch (error: any) {
        console.error('Error starting user deletion orchestration:', error)
        return reply.status(500).send({
          error: 'ORCHESTRATION_START_FAILED',
          message: 'Failed to start user deletion process'
        })
      }
    }
  )
}