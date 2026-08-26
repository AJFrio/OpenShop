// Local no-network Stripe degradation: when STRIPE_SECRET_KEY is the exact reserved
// sentinel from scripts/dev/build-local-config.mjs, remote Stripe sync is skipped
// while KV writes continue. Any other key value must delegate to the real client.
import { describe, it, expect, vi } from 'vitest'
import { StripeService } from '../../../src/services/StripeService.js'
import { ProductStripeService } from '../../../src/services/ProductStripeService.js'
import { LOCAL_NO_NETWORK_STRIPE_KEY } from '../../../src/services/StripeService.js'

/**
 * Replaces the internal Stripe HTTP client with one that fails the test if any
 * remote call is attempted — keeps the suite offline even if the guard regresses.
 */
function forbidRemoteCalls(service) {
  const boom = () => {
    throw new Error('remote Stripe call attempted in no-network mode')
  }
  service.stripe.products = { create: boom, update: boom }
  service.stripe.prices = { create: boom, update: boom }
}

describe('StripeService local no-network degradation', () => {
  it('flags only the exact reserved sentinel key', () => {
    expect(new StripeService(LOCAL_NO_NETWORK_STRIPE_KEY, 'http://localhost:8787').isLocalNoNetwork).toBe(true)
    expect(new StripeService('sk_test_mock', 'http://localhost:8787').isLocalNoNetwork).toBe(false)
    expect(new StripeService('sk_live_real', 'http://localhost:8787').isLocalNoNetwork).toBe(false)
    expect(LOCAL_NO_NETWORK_STRIPE_KEY).toBe('sk_test_local_no_network')
  })

  it('returns a local product stub without any remote call when sentinel', async () => {
    const service = new StripeService(LOCAL_NO_NETWORK_STRIPE_KEY, 'http://localhost:8787')
    forbidRemoteCalls(service)

    const result = await service.createProduct({ name: 'Local Widget', description: 'd', images: [] })
    expect(result.id).toBe('prod_local_no_network')
  })

  it('returns local price/archive stubs without any remote call when sentinel', async () => {
    const service = new StripeService(LOCAL_NO_NETWORK_STRIPE_KEY, 'http://localhost:8787')
    forbidRemoteCalls(service)

    const price = await service.createPrice({ amount: 9.99, currency: 'usd', productId: 'prod_x' })
    expect(price.id).toBe('price_local_no_network')

    await expect(service.updateProduct('prod_x', { name: 'n', images: [] })).resolves.toEqual({ id: 'prod_x' })
    await expect(service.archiveProduct('prod_x')).resolves.toEqual({ id: 'prod_x', active: false })
    await expect(service.archivePrice('price_x')).resolves.toEqual({ id: 'price_x', active: false })
  })

  it('still delegates to the real client for any other key value', async () => {
    const service = new StripeService('sk_test_mock', 'https://test.workers.dev')
    const createSpy = vi.fn().mockResolvedValue({ id: 'prod_real' })
    const priceSpy = vi.fn().mockResolvedValue({ id: 'price_real' })
    service.stripe.products = { create: createSpy, update: vi.fn() }
    service.stripe.prices = { create: priceSpy, update: vi.fn() }

    const product = await service.createProduct({ name: 'Real Widget', images: [] })
    expect(product.id).toBe('prod_real')
    expect(createSpy).toHaveBeenCalledTimes(1)

    const price = await service.createPrice({ amount: 5, currency: 'usd', productId: 'prod_real' })
    expect(price.id).toBe('price_real')
    expect(priceSpy).toHaveBeenCalledTimes(1)
  })
})

describe('ProductStripeService with no-network StripeService', () => {
  it('returns stub ids and skips remote sync when sentinel', async () => {
    const stripeService = new StripeService(LOCAL_NO_NETWORK_STRIPE_KEY, 'http://localhost:8787')
    forbidRemoteCalls(stripeService)
    const service = new ProductStripeService(stripeService)

    const result = await service.createProductWithPrices({
      name: 'Local Widget',
      description: 'd',
      price: 12,
      currency: 'usd',
      images: [],
      variants: [{ id: 'v1', name: 'Small', hasCustomPrice: false }],
      variants2: [],
    })

    expect(result.stripeProduct.id).toBe('prod_local_no_network')
    expect(result.basePrice.id).toBe('price_local_no_network')
    expect(result.variantPrices).toEqual({ v1: 'price_local_no_network' })
  })

  it('delegates to Stripe when the key is not the sentinel', async () => {
    const stripeService = new StripeService('sk_test_mock', 'https://test.workers.dev')
    const productSpy = vi.fn().mockResolvedValue({ id: 'prod_real' })
    const priceSpy = vi.fn().mockResolvedValue({ id: 'price_real' })
    stripeService.stripe.products = { create: productSpy, update: vi.fn() }
    stripeService.stripe.prices = { create: priceSpy, update: vi.fn() }
    const service = new ProductStripeService(stripeService)

    const result = await service.createProductWithPrices({
      name: 'Real Widget',
      description: 'd',
      price: 12,
      currency: 'usd',
      images: [],
      variants: [],
      variants2: [],
    })

    expect(result.stripeProduct.id).toBe('prod_real')
    expect(result.basePrice.id).toBe('price_real')
    expect(productSpy).toHaveBeenCalledTimes(1)
    expect(priceSpy).toHaveBeenCalledTimes(1)
  })
})
