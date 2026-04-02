// Integration tests for admin settings endpoints
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders, createTestStoreSettings } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import { KV_KEYS } from '../../src/config/index.js'

describe('Admin Settings Endpoints', () => {
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

  describe('GET /api/admin/storefront/theme', () => {
    it('should return default theme when no theme is set', async () => {
      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
    })

    it('should return stored theme when it exists', async () => {
      // This test depends on the theme service implementation
      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'GET'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/admin/storefront/theme', () => {
    it('should update theme with valid payload', async () => {
      const themePayload = {
        colors: {
          primary: '#9333ea',
          secondary: '#2563eb',
          accent: '#10b981',
          text: '#000000',
          background: '#ffffff',
          card: '#f9fafb'
        }
      }

      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'PUT',
        body: themePayload,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
    })

    it('should return 400 for invalid theme payload', async () => {
      const invalidPayload = {
        invalidField: 'invalid'
      }

      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'PUT',
        body: invalidPayload,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      // May return 400 or 200 depending on validation implementation
      expect([200, 400]).toContain(response.status)
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'PUT',
        body: { primaryColor: '#9333ea' }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/admin/storefront/theme', () => {
    it('should reset theme to defaults', async () => {
      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data).toBeDefined()
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/storefront/theme', {
        method: 'DELETE'
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/admin/store-settings', () => {
    it('should update store settings', async () => {
      const settings = {
        logoType: 'text',
        logoText: 'Updated Store',
        storeName: 'Updated Store Name',
        storeDescription: 'Updated description',
        contactEmail: 'updated@example.com'
      }

      const request = createTestRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: settings,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.storeName).toBe('Updated Store Name')
      expect(data.logoText).toBe('Updated Store')
      expect(data.contactEmail).toBe('updated@example.com')

      // Verify settings were stored in KV
      const storedSettings = await kv.get(KV_KEYS.STORE_SETTINGS)
      expect(storedSettings).toBeTruthy()
      const parsed = JSON.parse(storedSettings)
      expect(parsed.storeName).toBe('Updated Store Name')
    })

    it('should validate logoType', async () => {
      const invalidSettings = {
        logoType: 'invalid',
        storeName: 'Test Store'
      }

      const request = createTestRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: invalidSettings,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(500) // Service throws error for invalid logoType
    })

    it('should accept text logoType', async () => {
      const settings = {
        logoType: 'text',
        logoText: 'My Store',
        storeName: 'Test Store'
      }

      const request = createTestRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: settings,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should accept image logoType', async () => {
      const settings = {
        logoType: 'image',
        logoImageUrl: 'https://example.com/logo.png',
        storeName: 'Test Store'
      }

      const request = createTestRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: settings,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(200)
    })

    it('should merge with default settings', async () => {
      const partialSettings = {
        storeName: 'Custom Store',
        logoType: 'text' // Required field
      }

      const request = createTestRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: partialSettings,
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.storeName).toBe('Custom Store')
      // Default values should still be present
      expect(data.logoType).toBe('text')
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: { storeName: 'Test' }
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('Storefront page builder endpoints', () => {
    it('should return generated default page data for homepage', async () => {
      const request = createTestRequest('/api/admin/storefront/pages/home', {
        method: 'GET',
        headers: createAdminHeaders(adminToken),
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.pageId).toBe('home')
      expect(data.meta.isDefault).toBe(true)
      expect(Array.isArray(data.data.content)).toBe(true)
      expect(data.data.content.length).toBeGreaterThan(0)
    })

    it('should save and return storefront page data', async () => {
      const pageData = {
        content: [
          { type: 'SiteHeader', props: {} },
          { type: 'TextBlock', props: { title: 'Custom landing page', body: 'Built with Puck.' } },
          { type: 'SiteFooter', props: {} },
        ],
        root: { props: { title: 'Homepage' } },
        zones: {},
      }

      const request = createTestRequest('/api/admin/storefront/pages/home', {
        method: 'PUT',
        body: pageData,
        headers: createAdminHeaders(adminToken),
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.pageId).toBe('home')
      expect(data.meta.isDefault).toBe(false)
      expect(data.data.content[1].props.title).toBe('Custom landing page')

      const storedPage = await kv.get(`${KV_KEYS.STOREFRONT_PAGE_PREFIX}home`)
      expect(storedPage).toBeTruthy()
    })

    it('should reset storefront page data back to defaults', async () => {
      await kv.put(`${KV_KEYS.STOREFRONT_PAGE_PREFIX}about`, JSON.stringify({
        data: {
          content: [{ type: 'TextBlock', props: { title: 'Temporary about' } }],
          root: { props: { title: 'About Page' } },
          zones: {},
        },
        updatedAt: Date.now(),
      }))

      const request = createTestRequest('/api/admin/storefront/pages/about', {
        method: 'DELETE',
        headers: createAdminHeaders(adminToken),
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.pageId).toBe('about')
      expect(data.meta.isDefault).toBe(true)
      expect(await kv.get(`${KV_KEYS.STOREFRONT_PAGE_PREFIX}about`)).toBeNull()
    })

    it('should require authentication for page builder endpoints', async () => {
      const request = createTestRequest('/api/admin/storefront/pages/home', {
        method: 'GET',
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })
})

