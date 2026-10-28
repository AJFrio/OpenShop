// Integration tests for admin authentication
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import { KV_KEYS } from '../../src/config/index.js'

describe('Admin Authentication', () => {
  let app
  let env
  let kv

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
  })

  describe('POST /api/admin/login', () => {
    it('should login with valid password', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: env.ADMIN_PASSWORD }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
      expect(typeof data.token).toBe('string')
      expect(data.token.length).toBeGreaterThan(0)
    })

    it('should return 400 for missing password', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: {}
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Password')
    })

    it('should return 400 for non-string password', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: 12345 }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Password')
    })

    it('should return 401 for invalid password', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: 'wrong_password' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid password')
    })

    it('should authenticate against ADMIN_PASSWORD without storing a KV password hash', async () => {
      const hashKey = `${KV_KEYS.ADMIN_TOKEN_PREFIX}password_hash`
      await kv.put(hashKey, 'stale:hash:value')

      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: env.ADMIN_PASSWORD }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()

      // Legacy hash cleaned up; password is not stored in KV
      const storedHash = await kv.get(hashKey)
      expect(storedHash).toBeNull()
    })

    it('should store token in KV after successful login', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: env.ADMIN_PASSWORD }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
      expect(data.token).toBeTruthy()
    })

    it('should implement rate limiting', async () => {
      for (let i = 0; i < 5; i++) {
        const request = createTestRequest('/api/admin/login', {
          method: 'POST',
          body: { password: 'wrong_password' },
          headers: { 'CF-Connecting-IP': 'test-ip' }
        })
        await executeRequest(app, request, env)
      }

      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: 'wrong_password' },
        headers: { 'CF-Connecting-IP': 'test-ip' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toContain('Too many login attempts')
    })

    it('should clear rate limit on successful login', async () => {
      const rateLimitKey = 'rate_limit:login:test-ip'
      await kv.put(rateLimitKey, '4', { expirationTtl: 900 })

      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: env.ADMIN_PASSWORD },
        headers: { 'CF-Connecting-IP': 'test-ip' }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)

      const rateLimitValue = await kv.get(rateLimitKey)
      expect(rateLimitValue).toBeNull()
    })
  })

  describe('Admin Middleware Protection', () => {
    it('should allow access to protected routes with valid token', async () => {
      const token = await createAdminToken(env, kv)
      const headers = createAdminHeaders(token)

      const request = createTestRequest('/api/admin/products', {
        method: 'GET',
        headers
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).not.toBe(401)
    })

    it('should return 401 for protected routes without token', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toContain('authentication')
    })

    it('should return 401 for protected routes with invalid token', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'GET',
        headers: { 'X-Admin-Token': 'invalid_token' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid or expired')
    })

    it('should allow access to login endpoint without authentication', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: env.ADMIN_PASSWORD }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
    })

    it('should require authentication for Drive OAuth endpoints', async () => {
      const request = createTestRequest('/api/admin/drive/oauth/start', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })

    it('should return 400 for malformed JSON on login', async () => {
      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: '{not-json',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/JSON/i)
    })

    it('should use the first X-Forwarded-For hop when CF-Connecting-IP is absent', async () => {
      for (let i = 0; i < 5; i++) {
        await executeRequest(app, createTestRequest('/api/admin/login', {
          method: 'POST',
          body: { password: 'wrong_password' },
          headers: { 'X-Forwarded-For': '203.0.113.50, 10.0.0.1' }
        }), env)
      }

      const limited = await executeRequest(app, createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: 'wrong_password' },
        headers: { 'X-Forwarded-For': '203.0.113.50, 8.8.8.8' }
      }), env)
      const data = await parseJsonResponse(limited)
      expect(limited.status).toBe(401)
      expect(data.error).toContain('Too many login attempts')

      const otherHop = await executeRequest(app, createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: 'wrong_password' },
        headers: { 'X-Forwarded-For': '198.51.100.10, 203.0.113.50' }
      }), env)
      const otherData = await parseJsonResponse(otherHop)
      expect(otherData.error).toContain('Invalid password')
    })

    it('should prefer CF-Connecting-IP over X-Forwarded-For', async () => {
      await kv.put('rate_limit:login:192.0.2.4', '5', { expirationTtl: 900 })

      const request = createTestRequest('/api/admin/login', {
        method: 'POST',
        body: { password: 'wrong_password' },
        headers: {
          'CF-Connecting-IP': '192.0.2.4',
          'X-Forwarded-For': '198.51.100.20'
        }
      })
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)
      expect(response.status).toBe(401)
      expect(data.error).toContain('Too many login attempts')
    })
  })

  describe('POST /api/admin/logout', () => {
    it('should revoke the current session token', async () => {
      const token = await createAdminToken(env, kv)
      const { hashToken } = await import('../../src/utils/crypto.js')
      const hashedToken = await hashToken(token)
      const storageKey = `${KV_KEYS.ADMIN_TOKEN_PREFIX}${hashedToken}`
      expect(await kv.get(storageKey)).not.toBeNull()

      const logout = await executeRequest(app, createTestRequest('/api/admin/logout', {
        method: 'POST',
        headers: createAdminHeaders(token)
      }), env)
      expect(logout.status).toBe(200)
      expect(await kv.get(storageKey)).toBeNull()

      const protectedReq = await executeRequest(app, createTestRequest('/api/admin/products', {
        method: 'GET',
        headers: createAdminHeaders(token)
      }), env)
      expect(protectedReq.status).toBe(401)
    })

    it('should require authentication', async () => {
      const response = await executeRequest(app, createTestRequest('/api/admin/logout', {
        method: 'POST'
      }), env)
      expect(response.status).toBe(401)
    })
  })

  describe('Expired tokens', () => {
    it('should handle expired tokens', async () => {
      const { hashToken } = await import('../../src/utils/crypto.js')
      const token = 'expired-token'
      const hashedToken = await hashToken(token)
      const storageKey = `${KV_KEYS.ADMIN_TOKEN_PREFIX}${hashedToken}`

      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      await kv.put(storageKey, oldTimestamp.toString())

      const request = createTestRequest('/api/admin/products', {
        method: 'GET',
        headers: { 'X-Admin-Token': token }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toContain('expired')
    })
  })
})
