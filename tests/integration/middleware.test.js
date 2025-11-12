// Integration tests for middleware
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp, createTestRequest, executeRequest } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

describe('Middleware', () => {
  let app
  let env
  let kv

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const request = createTestRequest('/api/health', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('should include Content Security Policy header', async () => {
      const request = createTestRequest('/api/health', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const csp = response.headers.get('Content-Security-Policy')

      expect(csp).toBeDefined()
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self'")
    })

    it('should include Permissions-Policy header', async () => {
      const request = createTestRequest('/api/health', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const permissionsPolicy = response.headers.get('Permissions-Policy')

      expect(permissionsPolicy).toBeDefined()
      expect(permissionsPolicy).toContain('geolocation=()')
    })
  })

  describe('CORS Middleware', () => {
    it('should include CORS headers in responses', async () => {
      const request = createTestRequest('/api/health', {
        method: 'GET',
        headers: {
          'Origin': 'https://example.com'
        }
      })

      const response = await executeRequest(app, request, env)

      // CORS headers may vary based on configuration, but should be present
      const corsHeaders = [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers'
      ]

      // At least some CORS-related headers should be present
      const hasCorsHeaders = corsHeaders.some(header => response.headers.get(header) !== null)
      expect(hasCorsHeaders).toBe(true)
    })

    it('should handle OPTIONS preflight requests', async () => {
      const request = createTestRequest('/api/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET'
        }
      })

      const response = await executeRequest(app, request, env)

      // OPTIONS requests should be handled by CORS middleware (may return 200, 204, or 404 if no route)
      expect([200, 204, 404, 405]).toContain(response.status)
    })
  })

  describe('Admin Auth Middleware', () => {
    it('should protect admin routes', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)

      expect(response.status).toBe(401)
    })

    it('should allow access to login endpoint', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: env.ADMIN_PASSWORD }
      })

      const response = await executeRequest(app, request, env)

      expect(response.status).toBe(200)
    })

    it('should allow access to Drive OAuth endpoints', async () => {
      const request = createTestRequest('/api/admin/drive/oauth/start', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)

      // Should not return 401 (may return other status codes)
      expect(response.status).not.toBe(401)
    })
  })

  describe('Error Handler Middleware', () => {
    it('should catch and format errors', async () => {
      const request = createTestRequest('/api/products/non-existent', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)

      expect(response.status).toBe(404)
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle async errors', async () => {
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId: 'invalid' }
      })

      const response = await executeRequest(app, request, env)

      expect(response.status).toBe(400)
    })
  })
})


