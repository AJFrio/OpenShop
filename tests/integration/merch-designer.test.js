// Tests for the merch designer: prompt composition and the generate-and-store
// endpoint the agent calls.
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
import {
  composeMerchPrompt,
  composeMerchRequest,
  composeReferences,
} from '../../src/services/MerchPromptService.js'

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    products: { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() },
    prices: { create: vi.fn(), update: vi.fn() },
  })),
}))

const PIXEL = 'iVBORw0KGgoAAAANSUhEUg=='
const ref = (mimeType = 'image/png') => ({ mimeType, dataBase64: PIXEL })

describe('Merch prompt composition', () => {
  it('names each field rather than merging them', () => {
    const prompt = composeMerchPrompt({
      product: 'a grey hoodie',
      model: 'a young woman',
      pose: 'arms crossed',
      logo: 'a mountain crest',
    })

    expect(prompt).toContain('a grey hoodie')
    expect(prompt).toContain('worn by a young woman')
    expect(prompt).toContain('Pose: arms crossed')
    expect(prompt).toContain('Printed on the item: a mountain crest')
  })

  it('keeps the reference pose when pose is blank', () => {
    const prompt = composeMerchPrompt({ product: 'a tee', model: 'a man', pose: '' })
    expect(prompt).toContain('Keep the pose and framing from the reference image')
  })

  it('does not mention a pose when there is no model', () => {
    const prompt = composeMerchPrompt({ product: 'a tee' })
    expect(prompt).not.toContain('Keep the pose')
    expect(prompt).not.toContain('Pose:')
  })

  it('omits blank fields instead of describing them as unspecified', () => {
    const prompt = composeMerchPrompt({ product: 'a tee' })
    expect(prompt).not.toMatch(/worn by/i)
    expect(prompt).not.toMatch(/printed on/i)
    expect(prompt).not.toMatch(/undefined|unspecified/i)
  })

  it('orders references predictably and labels them', () => {
    // Deliberately out of order: the legend must match the image order.
    const { prompt, inputs } = composeMerchRequest(
      { product: 'a tee' },
      { logo: ref(), model: ref('image/jpeg') },
    )

    expect(inputs).toHaveLength(2)
    // model comes before logo in REFERENCE_ROLES
    expect(inputs[0].mimeType).toBe('image/jpeg')
    expect(prompt).toContain('Image 1 is the person who should be wearing the item')
    expect(prompt).toContain('Image 2 is the artwork or logo')
  })

  it('caps references at the generator limit', () => {
    const many = composeReferences({
      model: ref(), product: ref(), logo: ref(), extra: ref(), other: ref(),
    })
    // Only known roles are kept, and never more than the cap.
    expect(many.length).toBeLessThanOrEqual(4)
    expect(many.every((r) => ['model', 'product', 'logo'].includes(r.role))).toBe(true)
  })

  it('ignores a reference with no image data', () => {
    const { inputs } = composeMerchRequest({ product: 'a tee' }, { model: { mimeType: 'image/png' } })
    expect(inputs).toHaveLength(0)
  })
})

describe('POST /api/admin/ai/generate-merch-image', () => {
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

  function generate(body) {
    return executeRequest(app, createTestRequest('/api/admin/ai/generate-merch-image', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(body),
    }), env)
  }

  it('requires something to describe', async () => {
    const res = await generate({})
    expect(res.status).toBe(400)
  })

  it('reports a storage failure without blaming generation', async () => {
    env.GEMINI_API_KEY = 'k'
    delete env.IMAGES // no R2 bucket bound

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: PIXEL, mimeType: 'image/png' } }] } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    const res = await generate({ product: 'a hoodie' })
    const body = await parseJsonResponse(res)

    // The distinction matters: retrying generation would cost money and fail
    // again for the same reason.
    expect(res.status).toBe(503)
    expect(body.error).toMatch(/could not be saved/i)
    expect(body.error).toMatch(/R2/i)
  })
})
