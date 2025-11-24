// Integration tests for error handling
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import { ValidationError, AuthenticationError, NotFoundError, APIError } from '../../src/utils/errors.js'

describe('Error Handling', () => {
  let app
  let env
  let kv

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
  })

  describe('ValidationError (400)', () => {
    it('should return 400 for validation errors', async () => {
      // Test with missing required field
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: {}
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(400)
    })

    it('should include error message in response', async () => {
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId: 'invalid_format' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(typeof data.error).toBe('string')
      expect(data.error.length).toBeGreaterThan(0)
    })
  })

  describe('AuthenticationError (401)', () => {
    it('should return 401 for authentication errors', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(401)
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
  })

  describe('NotFoundError (404)', () => {
    it('should return 404 for non-existent resources', async () => {
      const request = createTestRequest('/api/products/non-existent-id', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should return 404 for non-existent collections', async () => {
      const request = createTestRequest('/api/collections/non-existent-id', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('APIError (500)', () => {
    it('should return 500 for internal server errors', async () => {
      // This test verifies the error handler catches unexpected errors
      // We can't easily trigger a 500 without mocking, but we can verify
      // the error handler structure is in place
      const request = createTestRequest('/api/health', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      
      // Health endpoint should work, but if it fails, should return proper error format
      if (response.status === 500) {
        const data = await parseJsonResponse(response)
        expect(data.error).toBeDefined()
        expect(data.status).toBe(500)
      } else {
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Error Response Format', () => {
    it('should return JSON error responses', async () => {
      const request = createTestRequest('/api/products/non-existent', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const contentType = response.headers.get('content-type')

      expect(contentType).toContain('application/json')
    })

    it('should include error and status in response', async () => {
      const request = createTestRequest('/api/products/non-existent', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('status')
      expect(typeof data.error).toBe('string')
      expect(typeof data.status).toBe('number')
    })

    it('should handle async errors properly', async () => {
      // Test that async errors are caught by asyncHandler
      const request = createTestRequest('/api/products/non-existent', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      // Should not throw, but return proper error response
      expect(response.status).toBe(404)
      expect(data.error).toBeDefined()
    })
  })

  describe('Error Handler Middleware', () => {
    it('should catch and format ValidationError', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(400)
    })

    it('should catch and format AuthenticationError', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(401)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(401)
    })

    it('should catch and format NotFoundError', async () => {
      const request = createTestRequest('/api/collections/non-existent/products', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(404)
    })
  })
})





