// Security headers middleware
/**
 * Adds security headers to responses
 * @param {Function} c - Hono context
 * @param {Function} next - Next middleware
 */
export async function securityHeadersMiddleware(c, next) {
  await next()
  
  // Security headers
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Content Security Policy
  // Adjust based on your needs - this is a restrictive default
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com", // Stripe requires unsafe-inline
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://*.stripe.com https://oauth2.googleapis.com https://www.googleapis.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  c.header('Content-Security-Policy', csp)
  
  // Strict Transport Security (only on HTTPS)
  const url = new URL(c.req.url)
  if (url.protocol === 'https:') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

