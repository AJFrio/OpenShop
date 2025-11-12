// Integration tests for admin collection endpoints
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders, createTestCollection, setupCollectionInKV } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

describe('Admin Collection Endpoints', () => {
  let app
  let env
  let kv
  let adminToken

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
    adminToken = await createAdminToken(env, kv)
  })

  describe('GET /api/admin/collections', () => {
    it('should return all collections including archived', async () => {
      const coll1 = createTestCollection({ id: 'coll_1', name: 'Collection 1' })
      const coll2 = createTestCollection({ id: 'coll_2', name: 'Collection 2', archived: true })
      const coll3 = createTestCollection({ id: 'coll_3', name: 'Collection 3' })

      await setupCollectionInKV(kv, coll1)
      await setupCollectionInKV(kv, coll2)
      await setupCollectionInKV(kv, coll3)

      const request = createTestRequest('/api/admin/collections', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
      expect(data.find(c => c.id === 'coll_1')).toBeTruthy()
      expect(data.find(c => c.id === 'coll_2')).toBeTruthy()
      expect(data.find(c => c.id === 'coll_3')).toBeTruthy()
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/collections', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/admin/collections', () => {
    it('should create a new collection', async () => {
      const collectionData = {
        id: `coll_${Date.now()}`,
        name: 'New Collection',
        description: 'Collection description',
        heroImage: 'https://example.com/hero.jpg'
      }

      const request = createTestRequest('/api/admin/collections', {
        method: 'POST',
        body: collectionData,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Collection')
      expect(data.description).toBe('Collection description')
      expect(data.heroImage).toBe('https://example.com/hero.jpg')
      expect(data.id).toBe(collectionData.id)
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/collections', {
        method: 'POST',
        body: { name: 'Test Collection' }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/admin/collections/:id', () => {
    it('should return a single collection', async () => {
      const collection = createTestCollection({ id: 'coll_123', name: 'Test Collection' })
      await setupCollectionInKV(kv, collection)

      const request = createTestRequest('/api/admin/collections/coll_123', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.id).toBe('coll_123')
      expect(data.name).toBe('Test Collection')
    })

    it('should return 404 for non-existent collection', async () => {
      const request = createTestRequest('/api/admin/collections/non-existent', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/collections/coll_123', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/admin/collections/:id', () => {
    it('should update a collection', async () => {
      const collection = createTestCollection({
        id: 'coll_123',
        name: 'Original Name',
        description: 'Original description'
      })
      await setupCollectionInKV(kv, collection)

      const request = createTestRequest('/api/admin/collections/coll_123', {
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
      expect(data.description).toBe('Updated description')
    })

    it('should return 404 for non-existent collection', async () => {
      const request = createTestRequest('/api/admin/collections/non-existent', {
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
      const request = createTestRequest('/api/admin/collections/coll_123', {
        method: 'PUT',
        body: { name: 'Updated' }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/admin/collections/:id', () => {
    it('should delete a collection', async () => {
      const collection = createTestCollection({ id: 'coll_123' })
      await setupCollectionInKV(kv, collection)

      const request = createTestRequest('/api/admin/collections/coll_123', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify collection is deleted from KV
      const deletedCollection = await kv.get('collection:coll_123')
      expect(deletedCollection).toBeNull()
    })

    it('should return 404 for non-existent collection', async () => {
      const request = createTestRequest('/api/admin/collections/non-existent', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/collections/coll_123', {
        method: 'DELETE'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })
})


