// Test utilities and helpers for integration testing
import { vi } from 'vitest'
import { createMockEnv, createMockKV } from '../setup.js'
import { hashToken } from '../../src/utils/crypto.js'
import { KV_KEYS } from '../../src/config/index.js'

/**
 * Create a mock Stripe instance
 */
export function createMockStripe() {
  const mockCheckoutSessions = {
    create: vi.fn(),
    retrieve: vi.fn(),
    list: vi.fn(),
    listLineItems: vi.fn()
  }

  const mockProducts = {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn()
  }

  const mockPrices = {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn()
  }

  const mockPaymentIntents = {
    retrieve: vi.fn(),
    list: vi.fn()
  }

  return {
    checkout: {
      sessions: mockCheckoutSessions
    },
    products: mockProducts,
    prices: mockPrices,
    paymentIntents: mockPaymentIntents
  }
}

/**
 * Create a test Hono app with all routes and middleware registered
 * This replicates the setup from worker.js
 */
export async function createTestApp() {
  const { Hono } = await import('hono')
  const { registerRoutes } = await import('../../src/routes/index.js')
  const { createCorsMiddleware } = await import('../../src/middleware/cors.js')
  const { errorHandler } = await import('../../src/middleware/errorHandler.js')
  const { verifyAdminAuth } = await import('../../src/middleware/auth.js')
  
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

  return app
}

/**
 * Create a test request for Hono
 */
export function createTestRequest(url, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    params = {}
  } = options

  const fullUrl = url.startsWith('http') ? url : `https://test.workers.dev${url}`
  const urlObj = new URL(fullUrl)

  // Create headers object
  const headersObj = new Headers(headers)

  // Create request
  const requestInit = {
    method,
    headers: headersObj
  }

  if (body && method !== 'GET' && method !== 'HEAD') {
    if (typeof body === 'string') {
      requestInit.body = body
    } else {
      requestInit.body = JSON.stringify(body)
      if (!('Content-Type' in headers)) {
        headersObj.set('Content-Type', 'application/json')
      }
    }
  }

  const request = new Request(fullUrl, requestInit)

  // Hono will extract params from the URL path automatically
  // No need to manually set request.params

  return request
}

/**
 * Execute a Hono route and get the response
 */
export async function executeRequest(app, request, env) {
  // Create execution context
  const executionContext = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn()
  }

  // Create Hono context
  const response = await app.fetch(request, env, executionContext)
  return response
}

/**
 * Parse JSON response
 */
export async function parseJsonResponse(response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Create test product data
 */
export function createTestProduct(overrides = {}) {
  return {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Product',
    description: 'A test product description',
    price: 29.99,
    currency: 'usd',
    images: ['https://example.com/image1.jpg'],
    stripePriceId: 'price_test123',
    stripeProductId: 'prod_test123',
    collectionId: null,
    variants: [],
    variants2: [],
    ...overrides
  }
}

/**
 * Create test collection data
 */
export function createTestCollection(overrides = {}) {
  return {
    id: `coll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Collection',
    description: 'A test collection',
    heroImage: 'https://example.com/hero.jpg',
    ...overrides
  }
}

/**
 * Create test store settings
 */
export function createTestStoreSettings(overrides = {}) {
  return {
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: '',
    storeName: 'OpenShop',
    storeDescription: 'Your amazing online store',
    heroImageUrl: '',
    heroTitle: 'Welcome to OpenShop',
    heroSubtitle: 'Discover amazing products',
    contactEmail: 'contact@example.com',
    ...overrides
  }
}

/**
 * Generate a valid admin token and store it in KV
 */
export async function createAdminToken(env, kvNamespace) {
  const token = 'test-admin-token-' + Date.now()
  const hashedToken = await hashToken(token)
  const storageKey = `${KV_KEYS.ADMIN_TOKEN_PREFIX}${hashedToken}`
  
  await kvNamespace.put(storageKey, Date.now().toString(), {
    expirationTtl: 86400 // 24 hours
  })

  return token
}

/**
 * Create headers with admin token
 */
export function createAdminHeaders(token) {
  return {
    'X-Admin-Token': token,
    'Content-Type': 'application/json'
  }
}

/**
 * Setup KV namespace in environment with multiple binding names
 * to ensure getKVNamespace can find it
 */
export function setupKVInEnv(env, kv) {
  // Set multiple possible binding names to ensure getKVNamespace finds it
  env.TEST_KV = kv
  env.OPENSHOP_KV = kv
  env.OPENSHOP_TEST3_KV = kv
  env['OPENSHOP-TEST3_KV'] = kv
  
  return env
}

/**
 * Setup test environment with pre-populated data
 */
export async function setupTestEnvironment(options = {}) {
  const env = createMockEnv()
  const kv = createMockKV()

  // Set KV namespace in env so getKVNamespace can find it
  // Try multiple binding names to match what the code expects
  env.TEST_KV = kv
  env.OPENSHOP_KV = kv
  env.OPENSHOP_TEST3_KV = kv

  // Pre-populate with test data if requested
  if (options.products) {
    for (const product of options.products) {
      await kv.put(`product:${product.id}`, JSON.stringify(product))
    }
  }

  if (options.collections) {
    for (const collection of options.collections) {
      await kv.put(`collection:${collection.id}`, JSON.stringify(collection))
    }
  }

  if (options.storeSettings) {
    const { KV_KEYS } = await import('../../src/config/index.js')
    await kv.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(options.storeSettings))
  }

  return { env, kv }
}

/**
 * Create a valid Stripe price ID
 */
export function createStripePriceId() {
  return `price_${Math.random().toString(36).substr(2, 24)}`
}

/**
 * Create a valid Stripe session ID
 */
export function createStripeSessionId() {
  return `cs_${Math.random().toString(36).substr(2, 24)}`
}

/**
 * Create test cart items
 */
export function createTestCartItems(count = 1, overrides = {}) {
  return Array.from({ length: count }, (_, i) => ({
    stripePriceId: createStripePriceId(),
    priceId: createStripePriceId(), // For backward compatibility
    quantity: 1,
    name: `Test Product ${i + 1}`,
    ...overrides[i] || {}
  }))
}

/**
 * Helper to properly set up a product in KV with index
 * This ensures the products:all index is maintained
 */
export async function setupProductInKV(kv, product) {
  await kv.put(`product:${product.id}`, JSON.stringify(product))
  
  // Update products index
  const productIds = await kv.get('products:all')
  const existingIds = productIds ? JSON.parse(productIds) : []
  if (!existingIds.includes(product.id)) {
    existingIds.push(product.id)
    await kv.put('products:all', JSON.stringify(existingIds))
  }
}

/**
 * Helper to properly set up a collection in KV with index
 * This ensures the collections:all index is maintained
 */
export async function setupCollectionInKV(kv, collection) {
  await kv.put(`collection:${collection.id}`, JSON.stringify(collection))
  
  // Update collections index
  const collectionIds = await kv.get('collections:all')
  const existingIds = collectionIds ? JSON.parse(collectionIds) : []
  if (!existingIds.includes(collection.id)) {
    existingIds.push(collection.id)
    await kv.put('collections:all', JSON.stringify(existingIds))
  }
}

