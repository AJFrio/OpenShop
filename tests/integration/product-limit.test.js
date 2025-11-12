// Integration tests for product limit feature
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders, createTestProduct, setupProductInKV } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import { StoreSettingsService } from '../../src/services/StoreSettingsService.js'
import { KV_KEYS } from '../../src/config/index.js'
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

describe('Product Limit Feature', () => {
  let app
  let env
  let kv
  let adminToken
  let mockStripe
  let settingsService

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
    adminToken = await createAdminToken(env, kv)
    mockStripe = new Stripe('sk_test_mock')
    settingsService = new StoreSettingsService(kv)
    vi.clearAllMocks()
  })

  describe('Product creation with limits', () => {
    it('should allow product creation when under limit', async () => {
      // Set limit to 5
      await settingsService.updateSettings({
        logoType: 'text',
        productLimit: '5'
      })

      // Create 2 products (under limit)
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1' })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2' })
      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)

      // Mock Stripe responses
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
    })

    it('should block product creation when limit is reached', async () => {
      // Set limit to 2
      await settingsService.updateSettings({
        logoType: 'text',
        productLimit: '2'
      })

      // Create 2 products (at limit)
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1' })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2' })
      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)

      // Mock Stripe (should not be called)
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(403)
      expect(data.error).toBe('Product limit reached')
      expect(data.message).toContain('limit of 2')
      expect(data.limit).toBe(2)
      expect(data.current).toBe(2)
      
      // Stripe should not be called when limit is reached
      expect(mockStripe.products.create).not.toHaveBeenCalled()
    })

    it('should allow product creation when limit is unlimited (null)', async () => {
      // Set limit to null (unlimited)
      await settingsService.updateSettings({
        logoType: 'text',
        productLimit: null
      })

      // Create 10 products
      for (let i = 1; i <= 10; i++) {
        await setupProductInKV(kv, createTestProduct({ id: `prod_${i}`, name: `Product ${i}` }))
      }

      // Mock Stripe responses
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
    })

    it('should allow product creation when limit is not set', async () => {
      // Don't set productLimit (defaults to null)
      await settingsService.updateSettings({
        logoType: 'text'
      })

      // Create many products
      for (let i = 1; i <= 20; i++) {
        await setupProductInKV(kv, createTestProduct({ id: `prod_${i}`, name: `Product ${i}` }))
      }

      // Mock Stripe responses
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
    })

    it('should only count active (non-archived) products', async () => {
      // Set limit to 2
      await settingsService.updateSettings({
        logoType: 'text',
        productLimit: '2'
      })

      // Create 1 active product and 2 archived products
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1', archived: false })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2', archived: true })
      const product3 = createTestProduct({ id: 'prod_3', name: 'Product 3', archived: true })
      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)
      await setupProductInKV(kv, product3)

      // Mock Stripe responses
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      // Should succeed because only 1 active product exists (under limit of 2)
      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
    })

    it('should use environment variable as fallback when store settings have no limit', async () => {
      // Don't set productLimit in store settings
      await settingsService.updateSettings({
        logoType: 'text'
      })

      // Set environment variable
      env.PRODUCT_LIMIT = '3'

      // Create 3 products (at limit from env var)
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1' })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2' })
      const product3 = createTestProduct({ id: 'prod_3', name: 'Product 3' })
      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)
      await setupProductInKV(kv, product3)

      // Mock Stripe (should not be called)
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(403)
      expect(data.error).toBe('Product limit reached')
      expect(data.limit).toBe(3)
      expect(data.current).toBe(3)
    })

    it('should handle invalid limit values gracefully', async () => {
      // Set invalid limit
      await settingsService.updateSettings({
        logoType: 'text',
        productLimit: 'invalid'
      })

      // Create many products
      for (let i = 1; i <= 10; i++) {
        await setupProductInKV(kv, createTestProduct({ id: `prod_${i}`, name: `Product ${i}` }))
      }

      // Mock Stripe responses
      mockStripe.products.create.mockResolvedValue({ id: 'prod_stripe123' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_stripe123' })

      const productData = {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        currency: 'usd',
        images: ['https://example.com/image.jpg']
      }

      const request = createTestRequest('/api/admin/products', {
        method: 'POST',
        body: productData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      // Should allow creation when limit is invalid (treats as unlimited)
      expect(response.status).toBe(201)
      expect(data.name).toBe('New Product')
    })

    it('should allow product updates even when limit is reached', async () => {
      // Set limit to 2
      await settingsService.updateSettings({
        logoType: 'text',
        productLimit: '2'
      })

      // Create 2 products (at limit)
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1', stripeProductId: 'prod_stripe1' })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2', stripeProductId: 'prod_stripe2' })
      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)

      // Mock Stripe for update
      mockStripe.products.retrieve.mockResolvedValue({ id: 'prod_stripe1' })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_stripe1' })

      // Update existing product (should work even at limit)
      const request = createTestRequest('/api/admin/products/prod_1', {
        method: 'PUT',
        body: {
          name: 'Updated Product Name'
        },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Product Name')
    })
  })
})

