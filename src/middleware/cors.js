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
  
  // Hono's CORS middleware accepts a function for origin to handle per-request logic
  // or a string/array for static origins
  // Use '*' directly if wildcard, otherwise use the array
  const originConfig = origins.length === 1 && origins[0] === '*' 
    ? '*' 
    : (origin) => {
        // Function to check if origin is allowed
        const requestOrigin = origin
        if (origins.includes('*') || origins.includes(requestOrigin)) {
          return requestOrigin
        }
        return origins[0] // Return first allowed origin if no match
      }
  
  return cors({
    origin: originConfig,
    allowMethods: CORS_ALLOWED_METHODS,
    allowHeaders: CORS_ALLOWED_HEADERS,
    credentials: true,
  })
}

