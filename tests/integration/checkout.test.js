// Integration tests for checkout process
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createStripePriceId, createStripeSessionId, createTestCartItems } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockCheckoutSessions = {
    create: vi.fn(),
    retrieve: vi.fn()
  }

  return {
    default: vi.fn(() => ({
      checkout: {
        sessions: mockCheckoutSessions
      }
    }))
  }
})

describe('Checkout Process', () => {
  let app
  let env
  let kv
  let mockStripe

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv

    // Reset Stripe mock
    mockStripe = new Stripe('sk_test_mock')
    vi.clearAllMocks()
  })

  describe('POST /api/create-checkout-session', () => {
    it('should create a checkout session with valid priceId', async () => {
      const priceId = createStripePriceId()
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId,
        url: 'https://checkout.stripe.com/test'
      })

      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe(sessionId)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'payment'
        })
      )
    })

    it('should return 400 for missing priceId', async () => {
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: {}
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('price ID')
    })

    it('should return 400 for invalid priceId format', async () => {
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId: 'invalid_price_id' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid price ID format')
    })

    it('should return 400 for empty priceId', async () => {
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId: '' }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('price ID')
    })

    it('should return 400 for priceId that is too long', async () => {
      const longPriceId = 'price_' + 'a'.repeat(300)
      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId: longPriceId }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('too long')
    })

    it('should trim whitespace from priceId', async () => {
      const priceId = createStripePriceId()
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId
      })

      const request = createTestRequest('/api/create-checkout-session', {
        method: 'POST',
        body: { priceId: `  ${priceId}  ` }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: priceId.trim(), quantity: 1 }]
        })
      )
    })
  })

  describe('POST /api/create-cart-checkout-session', () => {
    it('should create a cart checkout session with valid items', async () => {
      const items = createTestCartItems(2)
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId,
        url: 'https://checkout.stripe.com/test'
      })

      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe(sessionId)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled()
      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(callArgs.line_items).toHaveLength(2)
      expect(callArgs.metadata.item_count).toBe('2')
    })

    it('should return 400 for missing items array', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: {}
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cart items')
    })

    it('should return 400 for empty items array', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cart items')
    })

    it('should return 400 for cart size exceeding limit', async () => {
      const items = createTestCartItems(101)
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('exceeds maximum')
    })

    it('should return 400 for invalid item format', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [null] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid cart item format')
    })

    it('should return 400 for item without priceId', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [{ quantity: 1 }] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid price ID')
    })

    it('should return 400 for invalid priceId format in item', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [{ priceId: 'invalid', quantity: 1 }] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid price ID')
    })

    it('should support backward compatibility with stripePriceId', async () => {
      const items = [{
        stripePriceId: createStripePriceId(),
        quantity: 2
      }]
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId
      })

      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe(sessionId)
    })

    it('should normalize quantity from string to integer', async () => {
      const items = [{
        priceId: createStripePriceId(),
        quantity: '3'
      }]
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId
      })

      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(callArgs.line_items[0].quantity).toBe(3)
    })

    it('should default quantity to 1 when not provided', async () => {
      const items = [{
        priceId: createStripePriceId()
      }]
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId
      })

      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(callArgs.line_items[0].quantity).toBe(1)
    })

    it('should return 400 for quantity less than 1', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [{ priceId: createStripePriceId(), quantity: 0 }] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quantity')
    })

    it('should return 400 for quantity greater than 100', async () => {
      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items: [{ priceId: createStripePriceId(), quantity: 101 }] }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quantity')
    })

    it('should include variant information in metadata', async () => {
      const items = [{
        priceId: createStripePriceId(),
        quantity: 1,
        name: 'Test Product',
        selectedVariant: { name: 'Size: Large' },
        selectedVariant2: { name: 'Color: Red' }
      }]
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId
      })

      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(callArgs.metadata.item_0_name).toBe('Test Product')
      expect(callArgs.metadata.item_0_variant1).toBe('Size: Large')
      expect(callArgs.metadata.item_0_variant2).toBe('Color: Red')
    })

    it('should handle multiple items with correct quantities', async () => {
      const items = [
        { priceId: createStripePriceId(), quantity: 2 },
        { priceId: createStripePriceId(), quantity: 3 }
      ]
      const sessionId = createStripeSessionId()

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: sessionId
      })

      const request = createTestRequest('/api/create-cart-checkout-session', {
        method: 'POST',
        body: { items }
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(callArgs.line_items[0].quantity).toBe(2)
      expect(callArgs.line_items[1].quantity).toBe(3)
      expect(callArgs.metadata.total_quantity).toBe('5')
    })
  })

  describe('GET /api/checkout-session/:sessionId', () => {
    it('should retrieve checkout session details', async () => {
      const sessionId = createStripeSessionId()
      const mockSession = {
        id: sessionId,
        amount_total: 2999,
        currency: 'usd',
        customer_details: { email: 'test@example.com' },
        payment_status: 'paid',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession)

      const request = createTestRequest(`/api/checkout-session/${sessionId}`)
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.id).toBe(sessionId)
      expect(data.amount_total).toBe(2999)
      expect(data.currency).toBe('usd')
      expect(data.customer_email).toBe('test@example.com')
      expect(data.payment_status).toBe('paid')
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(sessionId)
    })

    it('should return 400 for invalid sessionId format', async () => {
      const request = createTestRequest('/api/checkout-session/invalid_session_id')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid session ID format')
    })

    it('should return 400 for sessionId without cs_ prefix', async () => {
      const request = createTestRequest('/api/checkout-session/price_test123')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid session ID format')
    })

    it('should return 400 for sessionId that is too long', async () => {
      const longSessionId = 'cs_' + 'a'.repeat(300)
      const request = createTestRequest(`/api/checkout-session/${longSessionId}`)
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(400)
      expect(data.error).toContain('too long')
    })

    it('should trim whitespace from sessionId', async () => {
      const sessionId = createStripeSessionId()
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: sessionId,
        amount_total: 1000,
        currency: 'usd',
        payment_status: 'unpaid',
        created: Math.floor(Date.now() / 1000)
      })

      const request = createTestRequest(`/api/checkout-session/  ${sessionId}  `)
      const response = await executeRequest(app, request, env)

      expect(response.status).toBe(200)
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(sessionId.trim())
    })
  })
})





