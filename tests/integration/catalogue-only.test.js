// Integration tests for catalogue-only mode (no STRIPE_SECRET_KEY configured).
//
// A store with no Stripe key can still be built out: products save to KV with
// placeholder ids, and checkout refuses rather than crashing. Once a key is
// added, the next save of an unlinked product creates it in Stripe for real.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestApp,
  createTestRequest,
  executeRequest,
  parseJsonResponse,
  createAdminToken,
  createAdminHeaders,
  createTestProduct,
  setupProductInKV,
} from '../utils/test-helpers.js'
import { createMockEnv, createMockKV } from '../setup.js'
import Stripe from 'stripe'

vi.mock('stripe', () => {
  const mockProducts = { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() }
  const mockPrices = { create: vi.fn(), update: vi.fn() }
  return {
    default: vi.fn(() => ({ products: mockProducts, prices: mockPrices })),
  }
})

describe('Catalogue-only mode (no STRIPE_SECRET_KEY)', () => {
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
    // The condition under test: no payment credentials.
    delete env.STRIPE_SECRET_KEY
  })

  it('reports payments as disabled', async () => {
    const req = createTestRequest('/api/payments-status')
    const res = await executeRequest(app, req, env)
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.paymentsEnabled).toBe(false)
  })

  it('reports payments as enabled when a key is present', async () => {
    env.STRIPE_SECRET_KEY = 'sk_test_mock'
    const req = createTestRequest('/api/payments-status')
    const res = await executeRequest(app, req, env)
    const body = await parseJsonResponse(res)

    expect(body.paymentsEnabled).toBe(true)
  })

  it('creates a product without calling Stripe', async () => {
    const stripe = new Stripe('sk_test_mock')
    const req = createTestRequest('/api/admin/products', {
      method: 'POST',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify(createTestProduct()),
    })
    const res = await executeRequest(app, req, env)

    // The whole point: this used to 500 with
    // "Neither apiKey nor config.authenticator provided".
    expect(res.status).toBe(201)
    expect(stripe.products.create).not.toHaveBeenCalled()
  })

  it('refuses checkout with a clear message', async () => {
    const req = createTestRequest('/api/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_123' }),
    })
    const res = await executeRequest(app, req, env)
    const body = await parseJsonResponse(res)

    expect(res.status).toBe(503)
    expect(body.error).toMatch(/not accepting payments/i)
  })

  it('backfills an unlinked product into Stripe once a key is configured', async () => {
    const product = createTestProduct({
      id: 'prod-unlinked-1',
      stripeProductId: 'prod_unlinked',
      stripePriceId: 'price_unlinked',
    })
    await setupProductInKV(kv, product)

    env.STRIPE_SECRET_KEY = 'sk_test_mock'
    const stripe = new Stripe('sk_test_mock')
    stripe.products.create.mockResolvedValue({ id: 'prod_real', name: product.name })
    stripe.prices.create.mockResolvedValue({ id: 'price_real' })

    const req = createTestRequest('/api/admin/products/prod-unlinked-1', {
      method: 'PUT',
      headers: createAdminHeaders(adminToken),
      body: JSON.stringify({ name: 'Renamed' }),
    })
    const res = await executeRequest(app, req, env)

    expect(res.status).toBe(200)
    // Created, not updated: prod_unlinked never existed in Stripe.
    expect(stripe.products.create).toHaveBeenCalled()
    expect(stripe.products.update).not.toHaveBeenCalled()
  })
})
