export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'

  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  code = 'NOT_FOUND_ERROR'

  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class BadRequestError extends Error {
  statusCode = 400
  code = 'BAD_REQUEST_ERROR'

  constructor(message = 'Bad request') {
    super(message)
    this.name = 'BadRequestError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  code = 'CONFLICT_ERROR'

  constructor(message = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  code = 'FORBIDDEN_ERROR'

  constructor(message = 'Access forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  code = 'UNAUTHORIZED_ERROR'

  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class InternalServerError extends Error {
  statusCode = 500
  code = 'INTERNAL_SERVER_ERROR'

  constructor(message = 'Internal server error') {
    super(message)
    this.name = 'InternalServerError'
  }
}