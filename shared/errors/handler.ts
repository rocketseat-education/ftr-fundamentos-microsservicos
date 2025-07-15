import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import type { ZodError } from 'zod'
import type { AppError } from './base-errors.ts'

export interface ErrorHandlerConfig {
  serviceName: string
  enableDetailedErrorLogging?: boolean
  customHandlers?: {
    [key: string]: (error: FastifyError, reply: FastifyReply) => Promise<void>
  }
}

export function setupErrorHandler(
  fastify: FastifyInstance,
  config: ErrorHandlerConfig
) {
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
            headers: config.enableDetailedErrorLogging ? request.headers : undefined,
            body: config.enableDetailedErrorLogging ? request.body : undefined,
          },
          service: config.serviceName,
        },
        'Request error'
      )

      // Check for custom handlers first
      if (config.customHandlers && error.code && config.customHandlers[error.code]) {
        await config.customHandlers[error.code](error, reply)
        return
      }

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

      // Handle URL validation errors
      if (error.code === 'ERR_INVALID_URL') {
        return reply.status(400).send({
          error: 'Invalid URL',
          message: 'The provided URL is not valid',
          code: 'INVALID_URL',
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