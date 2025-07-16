import { setupErrorHandler } from '@url-shortener/shared/errors/handler.ts'
import type { FastifyInstance } from 'fastify'

export function setupAuthErrorHandler(fastify: FastifyInstance) {
  setupErrorHandler(fastify, {
    serviceName: 'auth',
    enableDetailedErrorLogging: true,
    customHandlers: {
      // Auth specific error handlers
      '23505': async (error: any, reply: any) => {
        // PostgreSQL unique violation for users
        return reply.status(409).send({
          error: 'Conflict Error',
          message: 'User already exists',
          code: 'DUPLICATE_USER',
        })
      },
    },
  })
}

// Re-export error classes for backward compatibility
export {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@url-shortener/shared/errors/base-errors.ts'

// Additional auth-specific error
export class AuthenticationError extends Error {
  statusCode = 401
  code = 'AUTHENTICATION_ERROR'

  constructor(message: string = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}
