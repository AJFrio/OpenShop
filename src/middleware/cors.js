// CORS middleware configuration
import { cors } from 'hono/cors'
import { getCorsOrigins, CORS_ALLOWED_METHODS, CORS_ALLOWED_HEADERS } from '../config/index.js'

/**
 * Creates CORS middleware with configured options
 * @param {Object} env - Environment variables
 * @returns {Function} - Hono CORS middleware
 */
export function createCorsMiddleware(env = {}) {
  const origins = getCorsOrigins(env)
  
  return cors({
    origin: origins,
    allowMethods: CORS_ALLOWED_METHODS,
    allowHeaders: CORS_ALLOWED_HEADERS,
    credentials: true,
  })
}

