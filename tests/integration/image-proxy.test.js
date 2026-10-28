import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestApp, createTestRequest, executeRequest, parseJsonResponse } from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import { IMAGE_PROXY_CSP } from '../../src/config/index.js'

const DRIVE_SRC = encodeURIComponent('https://drive.google.com/file/d/abc123xyz/view')

describe('GET /api/image-proxy', () => {
  let app
  let env
  let kv
  const originalFetch = globalThis.fetch

  beforeEach(async () => {
    app = await createTestApp()
    env = createMockEnv()
    kv = createMockKV()
    env.TEST_KV = kv
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('requires src', async () => {
    const response = await executeRequest(app, createTestRequest('/api/image-proxy'), env)
    expect(response.status).toBe(400)
  })

  it('rejects hosts outside the Drive allowlist', async () => {
    const response = await executeRequest(
      app,
      createTestRequest('/api/image-proxy?src=' + encodeURIComponent('https://evil.example/image.jpg')),
      env
    )
    const data = await parseJsonResponse(response)
    expect(response.status).toBe(400)
    expect(data.error).toContain('Host not allowed')
  })

  it('serves allowed raster types with nosniff and a restrictive CSP', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'image/jpeg; charset=binary' },
    }))

    const response = await executeRequest(
      app,
      createTestRequest(`/api/image-proxy?src=${DRIVE_SRC}`),
      env
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Security-Policy')).toBe(IMAGE_PROXY_CSP)
  })

  it('rejects HTML upstream responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('<html><script>alert(1)</script></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }))

    const response = await executeRequest(
      app,
      createTestRequest(`/api/image-proxy?src=${DRIVE_SRC}`),
      env
    )
    const data = await parseJsonResponse(response)
    expect(response.status).toBe(415)
    expect(data.error).toMatch(/supported image type/i)
  })

  it('rejects SVG upstream responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>', {
      status: 200,
      headers: { 'content-type': 'image/svg+xml' },
    }))

    const response = await executeRequest(
      app,
      createTestRequest(`/api/image-proxy?src=${DRIVE_SRC}`),
      env
    )
    expect(response.status).toBe(415)
  })

  it('rejects missing content-type instead of defaulting to jpeg', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('<html>login</html>', {
      status: 200,
    }))

    const response = await executeRequest(
      app,
      createTestRequest(`/api/image-proxy?src=${DRIVE_SRC}`),
      env
    )
    expect(response.status).toBe(415)
  })

  it('returns 502 when the upstream fetch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }))

    const response = await executeRequest(
      app,
      createTestRequest(`/api/image-proxy?src=${DRIVE_SRC}`),
      env
    )
    expect(response.status).toBe(502)
  })
})
