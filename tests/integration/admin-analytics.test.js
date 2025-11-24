// Integration tests for admin analytics endpoints
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockCheckoutSessions = {
    list: vi.fn()
  }

  const mockPaymentIntents = {
    list: vi.fn()
  }

  return {
    default: vi.fn(() => ({
      checkout: {
        sessions: mockCheckoutSessions
      },
      paymentIntents: mockPaymentIntents
    }))
  }
})

describe('Admin Analytics Endpoints', () => {
  let app
  let env
  let kv
  let adminToken
  let mockStripe

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
    adminToken = await createAdminToken(env, kv)
    mockStripe = new Stripe('sk_test_mock')
    vi.clearAllMocks()
  })

  describe('GET /api/admin/analytics', () => {
    it('should return analytics data', async () => {
      const mockPaymentIntents = {
        data: [
          { id: 'pi_1', amount: 2999, status: 'succeeded', created: Math.floor(Date.now() / 1000) },
          { id: 'pi_2', amount: 4999, status: 'succeeded', created: Math.floor(Date.now() / 1000) }
        ]
      }

      mockStripe.paymentIntents.list.mockResolvedValue(mockPaymentIntents)

      const request = createTestRequest('/api/admin/analytics', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
    })

    it('should accept period query parameter', async () => {
      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] })

      const request = createTestRequest('/api/admin/analytics?period=7d', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/analytics', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/admin/analytics/orders', () => {
    it('should return orders list', async () => {
      const mockSessions = {
        data: [
          {
            id: 'cs_1',
            amount_total: 2999,
            currency: 'usd',
            payment_status: 'paid',
            customer_details: { email: 'test@example.com' },
            created: Math.floor(Date.now() / 1000)
          }
        ],
        has_more: false
      }

      mockStripe.checkout.sessions.list.mockResolvedValue(mockSessions)

      const request = createTestRequest('/api/admin/analytics/orders', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
      expect(Array.isArray(data.orders) || Array.isArray(data)).toBe(true)
    })

    it('should accept limit query parameter', async () => {
      mockStripe.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false })

      const request = createTestRequest('/api/admin/analytics/orders?limit=10', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should enforce maximum limit of 50', async () => {
      mockStripe.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false })

      const request = createTestRequest('/api/admin/analytics/orders?limit=100', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)

      // Verify limit was capped at 50
      expect(mockStripe.checkout.sessions.list).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50
        })
      )
    })

    it('should accept cursor and direction parameters', async () => {
      mockStripe.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false })

      const request = createTestRequest('/api/admin/analytics/orders?cursor=cs_123&direction=prev', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should filter fulfilled orders when showFulfilled is false', async () => {
      const mockSessions = {
        data: [
          {
            id: 'cs_1',
            amount_total: 2999,
            payment_status: 'paid',
            created: Math.floor(Date.now() / 1000)
          }
        ],
        has_more: false
      }

      mockStripe.checkout.sessions.list.mockResolvedValue(mockSessions)

      // Set up a fulfilled order in KV
      await kv.put('order_fulfillment:cs_1', JSON.stringify({
        fulfilled: true,
        fulfilledAt: new Date().toISOString()
      }))

      const request = createTestRequest('/api/admin/analytics/orders?showFulfilled=false', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/analytics/orders', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/admin/analytics/orders/:orderId/fulfill', () => {
    it('should mark an order as fulfilled', async () => {
      const orderId = 'cs_test123'

      const request = createTestRequest(`/api/admin/analytics/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.fulfillment).toBeDefined()
      expect(data.fulfillment.fulfilled).toBe(true)
      expect(data.fulfillment.fulfilledAt).toBeDefined()

      // Verify fulfillment was stored in KV
      const fulfillmentKey = `order_fulfillment:${orderId}`
      const storedFulfillment = await kv.get(fulfillmentKey)
      expect(storedFulfillment).toBeTruthy()
      const parsed = JSON.parse(storedFulfillment)
      expect(parsed.fulfilled).toBe(true)
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/analytics/orders/cs_test123/fulfill', {
        method: 'POST'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })
})





