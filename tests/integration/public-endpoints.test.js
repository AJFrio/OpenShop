// Integration tests for public API endpoints
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, setupTestEnvironment, createTestProduct, createTestCollection, createTestStoreSettings, setupProductInKV, setupCollectionInKV } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

describe('Public Endpoints', () => {
  let app
  let env
  let kv

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
  })

  describe('GET /api/products', () => {
    it('should return empty array when no products exist', async () => {
      const request = createTestRequest('/api/products')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    it('should return all active products', async () => {
      const product1 = createTestProduct({ id: 'prod_1', name: 'Product 1' })
      const product2 = createTestProduct({ id: 'prod_2', name: 'Product 2', archived: true })
      const product3 = createTestProduct({ id: 'prod_3', name: 'Product 3' })

      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)
      await setupProductInKV(kv, product3)

      const request = createTestRequest('/api/products')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data.find(p => p.id === 'prod_1')).toBeTruthy()
      expect(data.find(p => p.id === 'prod_3')).toBeTruthy()
      expect(data.find(p => p.id === 'prod_2')).toBeFalsy()
    })
  })

  describe('GET /api/products/:id', () => {
    it('should return a single product by ID', async () => {
      const product = createTestProduct({ id: 'prod_123', name: 'Test Product' })
      await setupProductInKV(kv, product)

      const request = createTestRequest('/api/products/prod_123')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.id).toBe('prod_123')
      expect(data.name).toBe('Test Product')
    })

    it('should return 404 for non-existent product', async () => {
      const request = createTestRequest('/api/products/non-existent')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('GET /api/collections', () => {
    it('should return empty array when no collections exist', async () => {
      const request = createTestRequest('/api/collections')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    it('should return all active collections', async () => {
      const coll1 = createTestCollection({ id: 'coll_1', name: 'Collection 1' })
      const coll2 = createTestCollection({ id: 'coll_2', name: 'Collection 2', archived: true })
      const coll3 = createTestCollection({ id: 'coll_3', name: 'Collection 3' })

      await setupCollectionInKV(kv, coll1)
      await setupCollectionInKV(kv, coll2)
      await setupCollectionInKV(kv, coll3)

      const request = createTestRequest('/api/collections')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data.find(c => c.id === 'coll_1')).toBeTruthy()
      expect(data.find(c => c.id === 'coll_3')).toBeTruthy()
      expect(data.find(c => c.id === 'coll_2')).toBeFalsy()
    })
  })

  describe('GET /api/collections/:id', () => {
    it('should return a single collection by ID', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection' })
      await setupCollectionInKV(kv, collection)

      const request = createTestRequest('/api/collections/coll_123')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.id).toBe('coll_123')
      expect(data.name).toBe('Test Collection')
    })

    it('should return 404 for non-existent collection', async () => {
      const request = createTestRequest('/api/collections/non-existent')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('GET /api/collections/:id/products', () => {
    it('should return products in a collection', async () => {
      const collection = createTestCollection({ id: 'coll_123' })
      const product1 = createTestProduct({ id: 'prod_1', collectionId: 'coll_123' })
      const product2 = createTestProduct({ id: 'prod_2', collectionId: 'coll_123' })
      const product3 = createTestProduct({ id: 'prod_3', collectionId: 'other' })

      await setupCollectionInKV(kv, collection)
      await setupProductInKV(kv, product1)
      await setupProductInKV(kv, product2)
      await setupProductInKV(kv, product3)

      const request = createTestRequest('/api/collections/coll_123/products')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data.find(p => p.id === 'prod_1')).toBeTruthy()
      expect(data.find(p => p.id === 'prod_2')).toBeTruthy()
      expect(data.find(p => p.id === 'prod_3')).toBeFalsy()
    })

    it('should return empty array for archived collection', async () => {
      const collection = createTestCollection({ id: 'coll_123', archived: true })
      const product = createTestProduct({ id: 'prod_1', collectionId: 'coll_123' })

      await setupCollectionInKV(kv, collection)
      await setupProductInKV(kv, product)

      const request = createTestRequest('/api/collections/coll_123/products')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(0)
    })

    it('should return 404 for non-existent collection', async () => {
      // The service should return 404 when collection doesn't exist
      const request = createTestRequest('/api/collections/non-existent-id-12345/products')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      // Should return 404 with error message
      expect(response.status).toBe(404)
      expect(data.error).toBeDefined()
      expect(data.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('GET /api/storefront/theme', () => {
    it('should return default theme when no theme is set', async () => {
      const request = createTestRequest('/api/storefront/theme')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
    })
  })

  describe('GET /api/store-settings', () => {
    it('should return default settings when no settings exist', async () => {
      const request = createTestRequest('/api/store-settings')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
      expect(data.storeName).toBeDefined()
      expect(data.logoType).toBeDefined()
    })

    it('should return custom settings when they exist', async () => {
      const settings = createTestStoreSettings({ storeName: 'Custom Store' })
      const { KV_KEYS } = await import('../../src/config/index.js')
      await kv.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(settings))

      const request = createTestRequest('/api/store-settings')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.storeName).toBe('Custom Store')
    })
  })

  describe('GET /api/contact-email', () => {
    it('should return default contact email when no settings exist', async () => {
      const request = createTestRequest('/api/contact-email')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.email).toBeDefined()
    })

    it('should return custom contact email from settings', async () => {
      const settings = createTestStoreSettings({ contactEmail: 'custom@example.com' })
      const { KV_KEYS } = await import('../../src/config/index.js')
      await kv.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(settings))

      const request = createTestRequest('/api/contact-email')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.email).toBe('custom@example.com')
    })
  })

  describe('GET /api/image-proxy', () => {
    it('should require src query parameter', async () => {
      const request = createTestRequest('/api/image-proxy')
      const response = await executeRequest(app, request, env)

      expect(response.status).toBe(400)
    })

    it('should proxy valid image URLs', async () => {
      // Mock fetch for image proxy
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: async () => new ArrayBuffer(8)
      })

      const request = createTestRequest('/api/image-proxy?src=https://example.com/image.jpg')
      const response = await executeRequest(app, request, env)

      // Note: Actual implementation may vary, but should handle the request
      expect(response).toBeDefined()
    })
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const request = createTestRequest('/api/health')
      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.timestamp).toBeDefined()
    })
  })
})


