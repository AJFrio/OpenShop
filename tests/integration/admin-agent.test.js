// Integration tests for admin agent endpoints (OpenRouter-backed store agent)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse, createAdminToken, createAdminHeaders } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

// Helper to build an OpenRouter chat completion response
function completionResponse(message) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message }]
    })
  }
}

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

    it('should execute tool calls against admin endpoints and return the reply', async () => {
      env.OPENROUTER_API_KEY = 'test-openrouter-key'

      const fetchMock = vi.fn()
        // First OpenRouter call: model requests to create a page
        .mockResolvedValueOnce(completionResponse({
          content: null,
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: {
              name: 'create_page',
              arguments: JSON.stringify({ slug: 'summer-sale' })
            }
          }]
        }))
        // Second OpenRouter call: final answer
        .mockResolvedValueOnce(completionResponse({
          content: 'Done! I created the summer-sale page.'
        }))

      vi.stubGlobal('fetch', fetchMock)

      const request = createTestRequest('/api/admin/agent/chat', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: 'Create a page called summer-sale' }] },
        headers: createAdminHeaders(adminToken)
      })

      const response = await executeRequest(app, request, env)
      const data = await parseJsonResponse(response)

      expect(response.status).toBe(200)
      expect(data.message).toBe('Done! I created the summer-sale page.')
      expect(data.actions).toHaveLength(1)
      expect(data.actions[0].tool).toBe('create_page')
      expect(data.actions[0].ok).toBe(true)

      // The page should actually exist in KV now (created through the real endpoint)
      const stored = await kv.get('storefront:page:summer-sale')
      expect(stored).toBeTruthy()

      // Both OpenRouter calls should have been made with tools attached
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(firstCallBody.tools.length).toBeGreaterThan(0)
      // Tool result should have been fed back as a tool message
      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body)
      const toolMsg = secondCallBody.messages.find((m) => m.role === 'tool')
      expect(toolMsg).toBeTruthy()
    })
  })
})
