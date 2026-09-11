// Regression tests for product and collection id generation.
//
// createProduct keyed on `product.id`, but no caller supplies one — not the
// admin UI, not the agent's create_product tool. Every create wrote to
// `product:undefined` and pushed `undefined` into products:all, so the
// request returned 201 with no id and the product was invisible everywhere
// afterwards. The agent reported success truthfully; the product was gone.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestApp,
  createTestRequest,
  executeRequest,
  parseJsonResponse,
  createAdminToken,
  createAdminHeaders,
  createTestProduct,
} from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    products: { create: vi.fn().mockResolvedValue({ id: 'prod_x' }), update: vi.fn(), retrieve: vi.fn() },
    prices: { create: vi.fn().mockResolvedValue({ id: 'price_x' }), update: vi.fn() },
  })),
}))

describe('Create assigns an id', () => {
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
    vi.clearAllMocks()
  })

  it('returns a product id on create', async () => {
    const res = await executeRequest(app, createTestRequest('/api/admin/products', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(createTestProduct({ id: undefined })),
    }), env)
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(201)
    expect(body.id).toBeTruthy()
    expect(String(body.id)).not.toBe('undefined')
  })

  it('makes a created product appear in the listing', async () => {
    await executeRequest(app, createTestRequest('/api/admin/products', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(createTestProduct({ id: undefined, name: 'Findable' })),
    }), env)

    const res = await executeRequest(app, createTestRequest('/api/admin/products', {
      headers: createAdminHeaders(adminToken),
    }), env)
    const list = await parseJsonResponse(res)

    // The symptom the user hit: created successfully, absent from the tab.
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Findable')
  })

  it('never writes a product:undefined key', async () => {
    await executeRequest(app, createTestRequest('/api/admin/products', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(createTestProduct({ id: undefined })),
    }), env)

    expect(await kv.get('product:undefined')).toBeNull()
    const index = JSON.parse(await kv.get('products:all'))
    expect(index).not.toContain(null)
    expect(index.filter(Boolean)).toHaveLength(1)
  })

  it('drops nulls left in the index by earlier broken creates', async () => {
    await kv.put('products:all', JSON.stringify([null, null]))

    await executeRequest(app, createTestRequest('/api/admin/products', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(createTestProduct({ id: undefined })),
    }), env)

    const index = JSON.parse(await kv.get('products:all'))
    expect(index).toHaveLength(1)
    expect(index[0]).toBeTruthy()
  })

  it('returns a collection id on create', async () => {
    const res = await executeRequest(app, createTestRequest('/api/admin/collections', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ name: 'Tees', description: '' }),
    }), env)
    const body = await parseJsonResponse(res)

    expect(body.id).toBeTruthy()
    expect(String(body.id)).not.toBe('undefined')
  })
})
