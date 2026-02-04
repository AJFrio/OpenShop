// Custom error classes for better error handling

/**
 * Base API error class
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.details = details
  }

  toJSON() {
    return {
      error: this.message,
      status: this.statusCode,
      ...(this.details && { details: this.details })
    }
  }
}

/**
 * Validation error
 */
export class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends APIError {
  constructor(message = 'Too many requests') {
    super(message, 429)
    this.name = 'RateLimitError'
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Access denied') {
    super(message, 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

