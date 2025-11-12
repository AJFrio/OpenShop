// Error handling middleware
import { APIError } from '../utils/errors.js'

/**
 * Standard error handler middleware for Hono
 * Catches errors and returns standardized JSON responses
 */
export function errorHandler(error, c) {
  console.error('Error in request handler:', error)

  // Handle known API errors
  if (error instanceof APIError) {
    return c.json(error.toJSON(), error.statusCode)
  }

  // Handle validation errors
  if (error.name === 'ValidationError' || error.status === 400) {
    return c.json({
      error: error.message || 'Validation error',
      status: 400
    }, 400)
  }

  // Handle authentication errors
  if (error.name === 'AuthenticationError' || error.status === 401) {
    return c.json({
      error: error.message || 'Authentication required',
      status: 401
    }, 401)
  }

  // Handle not found errors
  if (error.name === 'NotFoundError' || error.status === 404) {
    return c.json({
      error: error.message || 'Resource not found',
      status: 404
    }, 404)
  }

  // Default to 500 error
  return c.json({
    error: error.message || 'Internal server error',
    status: 500
  }, 500)
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(fn) {
  return async (c, next) => {
    try {
      return await fn(c, next)
    } catch (error) {
      return errorHandler(error, c)
    }
  }
}

