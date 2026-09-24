// Integration tests for admin agent endpoints (OpenRouter-backed store agent)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import { KV_KEYS } from '../../src/config/index.js'
import { TOOL_NAMES } from '../../src/routes/admin/agentTools.js'

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    products: {
      create: vi.fn().mockResolvedValue({ id: 'prod_stripe' }),
      update: vi.fn(),
      retrieve: vi.fn(),
    },
    prices: {
      create: vi.fn().mockResolvedValue({ id: 'price_stripe' }),
      update: vi.fn(),
    },
    checkout: { sessions: { list: vi.fn().mockResolvedValue({ data: [] }) } },
    paymentIntents: { list: vi.fn().mockResolvedValue({ data: [] }) },
  })),
}))

function completionResponse(message) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message }]
    })
  }
}

const REQUIRED_TOOLS = [
  'list_products', 'get_product', 'create_product', 'update_product', 'delete_product',
  'generate_product_image', 'generate_image',
  'list_collections', 'get_collection', 'create_collection', 'update_collection', 'delete_collection',
  'list_pages', 'get_page', 'create_page', 'update_page', 'delete_page',
  'list_media', 'add_media', 'delete_media',
  'get_store_settings', 'update_store_settings',
  'get_theme', 'update_theme', 'reset_theme',
  'get_analytics', 'list_orders', 'fulfill_order',
  'get_developer_settings', 'update_developer_settings',
]

describe('Admin Agent Endpoints', () => {
  let app
  let env
  let kv
  let adminToken

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
    delete env.OPENROUTER_API_KEY
    adminToken = await createAdminToken(env, kv)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('tool catalog', () => {
    it('exposes write tools for the full admin surface', () => {
      for (const name of REQUIRED_TOOLS) {
        expect(TOOL_NAMES).toContain(name)
      }
    })
  })

  describe('GET /api/admin/agent/models', () => {
    it('should report unconfigured when no API key is set', async () => {
      const request = createTestRequest('/api/admin/agent/models', {
        method: 'GET',
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.configured).toBe(false)
      expect(data.models).toEqual([])
    })

    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/agent/models', { method: 'GET' })
      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/admin/agent/chat', () => {
    it('should require authentication', async () => {
      const request = createTestRequest('/api/admin/agent/chat', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: 'hi' }] }
      })
      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(401)
    })

    it('should return an error when OPENROUTER_API_KEY is not configured', async () => {
      const request = createTestRequest('/api/admin/agent/chat', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: 'hi' }] },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(400)
    })

    it('should reject empty or invalid messages', async () => {
      env.OPENROUTER_API_KEY = 'test-openrouter-key'
      const request = createTestRequest('/api/admin/agent/chat', {
        method: 'POST',
        body: { messages: [] },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      expect(response.status).toBe(400)
    })

    async function runTool(tool, args, userContent = 'do it') {
      env.OPENROUTER_API_KEY = 'test-openrouter-key'

      const fetchMock = vi.fn()
        .mockResolvedValueOnce(completionResponse({
          content: null,
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: {
              name: tool,
              arguments: JSON.stringify(args)
            }
          }]
        }))
        .mockResolvedValueOnce(completionResponse({
          content: 'Done.'
        }))

      vi.stubGlobal('fetch', fetchMock)

      const request = createTestRequest('/api/admin/agent/chat', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: userContent }] },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)
      return { response, data, fetchMock }
    }

    it('should execute tool calls against admin endpoints and return the reply', async () => {
      const { response, data, fetchMock } = await runTool(
        'create_page',
        { slug: 'summer-sale' },
        'Create a page called summer-sale',
      )

      expect(response.status).toBe(200)
      expect(data.message).toBe('Done.')
      expect(data.actions).toHaveLength(1)
      expect(data.actions[0].tool).toBe('create_page')
      expect(data.actions[0].ok).toBe(true)

      const stored = await kv.get('storefront:page:summer-sale')
      expect(stored).toBeTruthy()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(firstCallBody.tools.length).toBeGreaterThan(0)
      const advertised = firstCallBody.tools.map((t) => t.function.name)
      expect(advertised).toEqual(expect.arrayContaining(REQUIRED_TOOLS))
      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      const toolMsg = secondCallBody.messages.find((m) => m.role === 'tool')
      expect(toolMsg).toBeTruthy()
    })

    it('creates a product with variants through the admin API', async () => {
      const { response, data } = await runTool('create_product', {
        name: 'Harbor Tee',
        price: 24.99,
        tagline: 'Soft cotton',
        variantStyle: 'Size',
        variants: [{ name: 'Small' }, { name: 'Large' }],
      })

      expect(response.status).toBe(200)
      expect(data.actions[0].ok).toBe(true)
      expect(data.actions[0].summary).toMatch(/Harbor Tee/)
      expect(data.actions[0].summary).not.toContain('undefined')

      const list = JSON.parse(await kv.get('products:all'))
      expect(list).toHaveLength(1)
      const product = JSON.parse(await kv.get(`product:${list[0]}`))
      expect(product.name).toBe('Harbor Tee')
      expect(product.tagline).toBe('Soft cotton')
      expect(product.variants).toHaveLength(2)
    })

    it('creates a collection with a hero image that would appear in the navbar', async () => {
      const { data } = await runTool('create_collection', {
        name: 'Summer',
        description: 'Warm weather',
        heroImage: 'https://example.com/summer.jpg',
      })

      expect(data.actions[0].ok).toBe(true)
      const ids = JSON.parse(await kv.get('collections:all'))
      const collection = JSON.parse(await kv.get(`collection:${ids[0]}`))
      expect(collection.name).toBe('Summer')
      expect(collection.heroImage).toBe('https://example.com/summer.jpg')
      expect(collection.archived).toBe(false)
    })

    it('updates store settings without wiping existing identity fields', async () => {
      await kv.put(KV_KEYS.STORE_SETTINGS, JSON.stringify({
        logoType: 'text',
        logoText: 'Harbor',
        storeName: 'Harbor Goods',
        contactEmail: 'keep@harbor.test',
      }))

      const { data } = await runTool('update_store_settings', {
        storeDescription: 'Coastal merch',
        logoText: 'Harbor Co',
      })

      expect(data.actions[0].ok).toBe(true)
      const stored = JSON.parse(await kv.get(KV_KEYS.STORE_SETTINGS))
      expect(stored.storeDescription).toBe('Coastal merch')
      expect(stored.logoText).toBe('Harbor Co')
      expect(stored.storeName).toBe('Harbor Goods')
      expect(stored.contactEmail).toBe('keep@harbor.test')
    })

    it('updates theme colors via the admin theme endpoint', async () => {
      const { data } = await runTool('update_theme', {
        colors: { primary: '#0f172a', accent: '#f59e0b' },
        fontId: 'lora',
      })

      expect(data.actions[0].ok).toBe(true)
      const stored = JSON.parse(await kv.get('storefront:theme'))
      expect(stored.theme.colors.primary).toBe('#0f172a')
      expect(stored.theme.colors.accent).toBe('#f59e0b')
      expect(stored.theme.typography.fontId).toBe('lora')
    })

    it('adds media library items by URL', async () => {
      const { data } = await runTool('add_media', {
        url: 'https://example.com/logo.png',
        filename: 'logo.png',
      })

      expect(data.actions[0].ok).toBe(true)
      const ids = JSON.parse(await kv.get('media:all'))
      expect(ids).toHaveLength(1)
      const item = JSON.parse(await kv.get(`media:${ids[0]}`))
      expect(item.url).toBe('https://example.com/logo.png')
    })

    it('reads then writes a page (get_page is advertised and implemented)', async () => {
      const { data } = await runTool('update_page', {
        slug: 'home',
        seoTitle: 'Harbor Goods',
        content: [{
          type: 'HeroSection',
          props: { title: 'Welcome to Harbor', subtitle: 'Coastal merch' },
        }],
      })

      expect(data.actions[0].ok).toBe(true)
      const page = JSON.parse(await kv.get('storefront:page:home'))
      expect(page.data.root.props.title).toBe('Harbor Goods')
      expect(page.data.content[0].props.title).toBe('Welcome to Harbor')
    })

    it('fulfills an order', async () => {
      const { data } = await runTool('fulfill_order', { orderId: 'cs_test_1' })
      expect(data.actions[0].ok).toBe(true)
      const stored = JSON.parse(await kv.get('order_fulfillment:cs_test_1'))
      expect(stored.fulfilled).toBe(true)
    })

    it('refuses to write secret developer settings through the agent', async () => {
      const { data } = await runTool('update_developer_settings', {
        STRIPE_SECRET_KEY: 'sk_live_should_not_work',
      })
      expect(data.actions[0].ok).toBe(false)
      expect(data.actions[0].summary).toMatch(/cannot be written/i)
    })

    it('updates non-secret developer settings', async () => {
      const { data } = await runTool('update_developer_settings', {
        OPENROUTER_MODEL: 'z-ai/glm-5.3-flash',
      })
      expect(data.actions[0].ok).toBe(true)
      const stored = JSON.parse(await kv.get(KV_KEYS.DEVELOPER_SETTINGS))
      expect(stored.OPENROUTER_MODEL).toBe('z-ai/glm-5.3-flash')
    })
  })
})
