import { setupErrorHandler } from '@url-shortener/shared/errors/handler.ts'
import type { FastifyInstance } from 'fastify'

export function setupUrlShortenerErrorHandler(fastify: FastifyInstance) {
  setupErrorHandler(fastify, {
    serviceName: 'url-shortener',
    enableDetailedErrorLogging: true,
    customHandlers: {
      // URL shortener specific error handlers
      '23505': async (error: any, reply: any) => {
        // PostgreSQL unique violation for short codes
        return reply.status(409).send({
          error: 'Conflict Error',
          message: 'Short code already exists',
          code: 'DUPLICATE_SHORT_CODE',
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
