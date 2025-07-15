import type {
  FastifyInstance,
  FastifyError,
  FastifyRequest,
  FastifyReply,
} from 'fastify'
import type { ZodError } from 'zod'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export class AuthenticationError extends Error {
  statusCode = 401
  code = 'AUTHENTICATION_ERROR'

  constructor(message: string = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'

  constructor(message: string = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  code = 'CONFLICT_ERROR'

  constructor(message: string = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  code = 'NOT_FOUND_ERROR'

  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    async (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const { method, url } = request

      // Log error details
      fastify.log.error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            statusCode: error.statusCode,
            code: error.code,
          },
          request: {
            method,
            url,
            headers: request.headers,
            body: request.body,
          },
        },
        'Request error'
      )

      // Handle Zod validation errors
      if (error.code === 'FST_ERR_VALIDATION') {
        const zodError = error.validation as unknown as ZodError
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: zodError.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        })
      }

      // Handle custom application errors
      if (error.statusCode) {
        return reply.status(error.statusCode).send({
          error: error.name || 'Application Error',
          message: error.message,
          code: (error as AppError).code,
        })
      }

      // Handle JWT errors
      if (
        error.code === 'FST_JWT_BAD_REQUEST' ||
        error.code === 'FST_JWT_UNAUTHORIZED'
      ) {
        return reply.status(401).send({
          error: 'Authentication Error',
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        })
      }

      // Handle rate limiting errors
      if (error.statusCode === 429) {
        return reply.status(429).send({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
        })
      }

      // Handle database errors
      if (error.code === 'P2002') {
        // Prisma unique constraint
        return reply.status(409).send({
          error: 'Conflict Error',
          message: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE',
        })
      }

      // Handle PostgreSQL errors
      if (error.code === '23505') {
        // PostgreSQL unique violation
        return reply.status(409).send({
          error: 'Conflict Error',
          message: 'Resource already exists',
          code: 'DUPLICATE_RESOURCE',
        })
      }

      // Handle timeout errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        return reply.status(504).send({
          error: 'Gateway Timeout',
          message: 'Service temporarily unavailable',
          code: 'SERVICE_TIMEOUT',
        })
      }

      // Default 500 error
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      })
    }
  )

  // Handle 404 errors
  fastify.setNotFoundHandler(
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
        code: 'ROUTE_NOT_FOUND',
      })
    }
  )
}
