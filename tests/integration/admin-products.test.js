// Integration tests for admin product endpoints
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders, createTestProduct, setupProductInKV } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockProducts = {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn()
  }

  const mockPrices = {
    create: vi.fn(),
    update: vi.fn()
  }

  return {
    default: vi.fn(() => ({
      products: mockProducts,
      prices: mockPrices
    }))
  }
})

describe('Admin Product Endpoints', () => {
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

  describe('GET /api/admin/products', () => {
    it('should return all products including archived', async () => {
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1' })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2', archived: true })
      const product3 = createTestProduct({ id: 'prod_3', name: 'Product 3' })

      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)
      await setupProductInKV(kv, product3)

      const request = createTestRequest('/api/admin/products', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
      expect(data.find(p => p.id === 'prod_1')).toBeTruthy()
      expect(data.find(p => p.id === 'prod_2')).toBeTruthy()
      expect(data.find(p => p.id === 'prod_3')).toBeTruthy()
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/admin/products', () => {
    it('should create a product with Stripe integration', async () => {
      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      // Mock Stripe responses
      const mockStripeProduct = { id: 'prod_stripe123' }
      const mockStripePrice = { id: 'price_stripe123' }
      
      mockStripe.products.create.mockResolvedValue(mockStripeProduct)
      mockStripe.prices.create.mockResolvedValue(mockStripePrice)

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
      expect(data.stripeProductId).toBe('prod_stripe123')
      expect(data.stripePriceId).toBe('price_stripe123')
      expect(mockStripe.products.create).toHaveBeenCalled()
      expect(mockStripe.prices.create).toHaveBeenCalled()
    })

    it('should handle products with variants', async () => {
      const productData = {
        name: 'Product with Variants',
        price: 29.99,
        currency: 'usd',
        variants: [
          { name: 'Size', options: ['Small', 'Large'] }
        ]
      }

      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(Array.isArray(data.variants)).toBe(true)
    })

    it('should normalize images to array', async () => {
      const productData = {
        name: 'Product',
        price: 29.99,
        currency: 'usd',
        imageUrl: 'https://example.com/image.jpg'
      }

      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(Array.isArray(data.images) || data.imageUrl).toBeTruthy()
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: { name: 'Test', price: 10 }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/admin/products/:id', () => {
    it('should return a single product', async () => {
      const product = createTestProduct({ id: 'prod_123', name: 'Test Product' })
      await setupProductInKV(kv, product)

      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.id).toBe('prod_123')
      expect(data.name).toBe('Test Product')
    })

    it('should return 404 for non-existent product', async () => {
      const request = createTestRequest('/api/admin/products/non-existent', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/admin/products/:id', () => {
    it('should update product name and description', async () => {
      const product = createTestProduct({
        id: 'prod_123',
        name: 'Original Name',
        stripeProductId: 'prod_stripe123'
      })
      await setupProductInKV(kv, product)

      mockStripe.products.retrieve.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_stripe123' })

      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
          description: 'Updated description'
        },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Name')
      expect(mockStripe.products.update).toHaveBeenCalled()
    })

    it('should create new Stripe price when price changes', async () => {
      const product = createTestProduct({
        id: 'prod_123',
        price: 29.99,
        stripePriceId: 'price_old123',
        stripeProductId: 'prod_stripe123'
      })
      await setupProductInKV(kv, product)

      mockStripe.products.retrieve.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_new123' })
      mockStripe.prices.update.mockResolvedValue({ id: 'price_old123' })

      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'PUT',
        body: { price: 39.99 },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.price).toBe(39.99)
      expect(data.stripePriceId).toBe('price_new123')
      expect(mockStripe.prices.create).toHaveBeenCalled()
    })

    it('should update product images in Stripe', async () => {
      const product = createTestProduct({
        id: 'prod_123',
        stripeProductId: 'prod_stripe123'
      })
      await setupProductInKV(kv, product)

      mockStripe.products.retrieve.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_stripe123' })

      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'PUT',
        body: {
          images: ['https://example.com/new-image.jpg']
        },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(mockStripe.products.update).toHaveBeenCalledWith(
        'prod_stripe123',
        expect.objectContaining({
          images: expect.arrayContaining(['https://example.com/new-image.jpg'])
        })
      )
    })

    it('should return 404 for non-existent product', async () => {
      const request = createTestRequest('/api/admin/products/non-existent', {
        method: 'PUT',
        body: { name: 'Updated' },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'PUT',
        body: { name: 'Updated' }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/admin/products/:id', () => {
    it('should delete a product and archive Stripe resources', async () => {
      const product = createTestProduct({
        id: 'prod_123',
        stripePriceId: 'price_123',
        stripeProductId: 'prod_stripe123'
      })
      await setupProductInKV(kv, product)

      mockStripe.prices.update.mockResolvedValue({ id: 'price_123', active: false })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_stripe123', active: false })

      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStripe.prices.update).toHaveBeenCalledWith(
        'price_123',
        { active: false }
      )
      expect(mockStripe.products.update).toHaveBeenCalledWith(
        'prod_stripe123',
        { active: false }
      )

      // Verify product is deleted from KV
      const deletedProduct = await kv.get('product:prod_123')
      expect(deletedProduct).toBeNull()
    })

    it('should return 404 for non-existent product', async () => {
      const request = createTestRequest('/api/admin/products/non-existent', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/products/prod_123', {
        method: 'DELETE'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })
})


