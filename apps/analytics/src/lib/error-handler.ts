import { setupErrorHandler } from '@url-shortener/shared/errors/handler.ts'
import type { FastifyInstance } from 'fastify'

export function setupAnalyticsErrorHandler(fastify: FastifyInstance) {
  setupErrorHandler(fastify, {
    serviceName: 'analytics',
    enableDetailedErrorLogging: true,
    customHandlers: {
      // Analytics specific error handlers can be added here
    },
  })
}

// Re-export error classes for backward compatibility
export {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@url-shortener/shared/errors/base-errors.ts'
