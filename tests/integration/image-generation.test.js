// Tests for image generation across both providers.
//
// The contract: the admin UI sends { prompt, inputs } and gets back
// { mimeType, dataBase64 }, regardless of which provider served it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestApp,
  createTestRequest,
  executeRequest,
  parseJsonResponse,
  createAdminToken,
  createAdminHeaders,
} from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    products: { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() },
    prices: { create: vi.fn(), update: vi.fn() },
  })),
}))

const PIXEL = 'iVBORw0KGgoAAAANSUhEUg=='

describe('Image generation', () => {
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
    vi.restoreAllMocks()
  })

  function generate(body = { prompt: 'a mug' }) {
    return executeRequest(app, createTestRequest('/api/admin/ai/generate-image', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(body),
    }), env)
  }

  it('reports when no provider is configured', async () => {
    delete env.GEMINI_API_KEY
    delete env.OPENROUTER_API_KEY

    const res = await generate()
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/not configured/i)
  })

  it('uses Gemini when only a Gemini key is set', async () => {
    env.GEMINI_API_KEY = 'gem-key'
    delete env.OPENROUTER_API_KEY

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: PIXEL, mimeType: 'image/png' } }] } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    const res = await generate()
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.dataBase64).toBe(PIXEL)
    expect(fetchSpy.mock.calls[0][0]).toContain('generativelanguage.googleapis.com')
    // The shut-down preview model must never be the default again.
    expect(fetchSpy.mock.calls[0][0]).toContain('gemini-3.1-flash-image')
    expect(fetchSpy.mock.calls[0][0]).not.toContain('2.5-flash-image-preview')
  })

  it('falls back to OpenRouter when only that key is set', async () => {
    delete env.GEMINI_API_KEY
    env.OPENROUTER_API_KEY = 'or-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [{ b64_json: PIXEL, media_type: 'image/webp' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    const res = await generate()
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.dataBase64).toBe(PIXEL)
    // Output format varies by model, so the response's own type is used.
    expect(body.mimeType).toBe('image/webp')
    expect(fetchSpy.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/images')
  })

  it('honours an explicit provider choice over key presence', async () => {
    env.GEMINI_API_KEY = 'gem-key'
    env.OPENROUTER_API_KEY = 'or-key'
    env.IMAGE_PROVIDER = 'openrouter'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [{ b64_json: PIXEL, media_type: 'image/png' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    await generate()
    expect(fetchSpy.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/images')
  })

  it('passes reference images through as data URLs', async () => {
    delete env.GEMINI_API_KEY
    env.OPENROUTER_API_KEY = 'or-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [{ b64_json: PIXEL, media_type: 'image/png' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    await generate({
      prompt: 'a mug',
      inputs: [{ dataBase64: PIXEL, mimeType: 'image/jpeg' }],
    })

    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(sent.input_references).toHaveLength(1)
    expect(sent.input_references[0].image_url.url).toBe(`data:image/jpeg;base64,${PIXEL}`)
  })

  it('caps reference images at what the UI sends', async () => {
    delete env.GEMINI_API_KEY
    env.OPENROUTER_API_KEY = 'or-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ data: [{ b64_json: PIXEL, media_type: 'image/png' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    await generate({
      prompt: 'a mug',
      inputs: Array.from({ length: 9 }, () => ({ dataBase64: PIXEL, mimeType: 'image/png' })),
    })

    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(sent.input_references).toHaveLength(4)
  })

  it('surfaces an upstream failure as 502 rather than a generic 500', async () => {
    delete env.GEMINI_API_KEY
    env.OPENROUTER_API_KEY = 'or-key'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('model unavailable', { status: 503 }),
    )

    const res = await generate()
    expect(res.status).toBe(502)
  })

  it('rejects an invalid provider at save time', async () => {
    const res = await executeRequest(app, createTestRequest('/api/admin/developer-settings', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ IMAGE_PROVIDER: 'dall-e' }),
    }), env)

    expect(res.status).toBe(400)
  })
})
