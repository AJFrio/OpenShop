// Main Cloudflare Worker with Hono framework
import { Hono } from 'hono'
import { createCorsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { verifyAdminAuth } from './middleware/auth.js'
import { registerRoutes } from './routes/index.js'

const app = new Hono()

// Security headers middleware (applied to all routes)
app.use('*', async (c, next) => {
  await next()
  
  // Security headers
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
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
})

// CORS middleware (needs env for proper configuration)
app.use('*', (c, next) => {
  const corsMiddleware = createCorsMiddleware(c.env)
  return corsMiddleware(c, next)
})

// Admin authentication middleware
app.use('/api/admin/*', async (c, next) => {
  // Skip auth for login and Drive OAuth endpoints (popup has no headers)
  const unauthenticatedPaths = new Set([
    '/api/admin/login',
    '/api/admin/drive/oauth/start',
    '/api/admin/drive/oauth/callback'
  ])
  if (unauthenticatedPaths.has(c.req.path)) {
    return next()
  }

  try {
    const authResult = await verifyAdminAuth(c.req, c.env)
    if (!authResult.isValid) {
      console.error('Auth failed:', authResult.error)
      return c.json({ error: authResult.error }, authResult.status)
    }

    return next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication middleware failed' }, 500)
  }
})

// Register all routes
registerRoutes(app)

// Error handler (must be last)
app.onError(errorHandler)

// Handle static assets using Workers Assets
app.get('*', async (c) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname
  
  // Skip API routes - they're handled above
  if (pathname.startsWith('/api/')) {
    return c.notFound()
  }
  
  try {
    // Try to serve the requested file first
    if (pathname !== '/' && !pathname.startsWith('/admin') && !pathname.startsWith('/collections') && !pathname.startsWith('/products') && !pathname.startsWith('/success')) {
      const asset = await c.env.ASSETS.fetch(c.req)
      if (asset.ok) {
        return asset
      }
    }
    
    // For SPA routes (/admin, /collections, etc.) or root, serve index.html
    const indexUrl = new URL(c.req.url)
    indexUrl.pathname = '/index.html'
    const indexRequest = new Request(indexUrl, c.req)
    const indexAsset = await c.env.ASSETS.fetch(indexRequest)
    
    if (indexAsset.ok) {
      return indexAsset
    } else {
      throw new Error('index.html not found')
    }
  } catch (error) {
    console.error('Error serving static asset:', error, 'for path:', pathname)
    
    // Fallback HTML for when assets can't be loaded
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OpenShop - Loading Error</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #9333ea 0%, #2563eb 100%);
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .container { max-width: 500px; }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            .error { font-size: 1.2rem; margin: 20px 0; opacity: 0.9; }
            .help { font-size: 1rem; margin-top: 30px; opacity: 0.8; }
            a { color: white; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>OpenShop</h1>
            <div class="error">Application loading error</div>
            <p>The application assets could not be loaded.</p>
            <div class="help">
              <p>Try:</p>
              <ul style="text-align: left; display: inline-block;">
                <li>Refreshing the page</li>
                <li>Checking your internet connection</li>
                <li>Contacting support if the issue persists</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `, 500)
  }
})

export default app
