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
  const allowAny = origins.length === 1 && origins[0] === '*'

  // Wildcard cannot be combined with credentials (CORS spec). Reflect
  // allowed origins only; unmatched Origin is omitted rather than rewritten
  // to the first allowlist entry.
  const originConfig = allowAny
    ? '*'
    : (origin) => {
        if (origin && origins.includes(origin)) {
          return origin
        }
        return null
      }

  return cors({
    origin: originConfig,
    allowMethods: CORS_ALLOWED_METHODS,
    allowHeaders: CORS_ALLOWED_HEADERS,
    credentials: !allowAny,
  })
}
