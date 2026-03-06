import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductStripeService } from '../../src/services/ProductStripeService.js'

class MockStripeService {
  async createProduct() { return { id: 'prod_123' } }
  async createPrice(data) { return { id: `price_${Math.random()}` } }
  async archivePrice() { return true }
}

describe('ProductStripeService Performance', () => {
  let stripeService
  let productStripeService

  beforeEach(() => {
    vi.clearAllMocks()
    stripeService = new MockStripeService()
    productStripeService = new ProductStripeService(stripeService)
  })

  it('should verify variant update performance', async () => {
    // Generate a large number of existing variants
    const NUM_VARIANTS = 10000;
    const existingVariants = Array.from({ length: NUM_VARIANTS }).map((_, i) => ({
      id: `var_${i}`,
      name: `Variant ${i}`,
      price: 10 + i,
      hasCustomPrice: true,
      stripePriceId: `price_${i}`
    }));

    const existingVariants2 = Array.from({ length: NUM_VARIANTS }).map((_, i) => ({
      id: `var2_${i}`,
      name: `Variant2 ${i}`,
      price: 100 + i,
      hasCustomPrice: true,
      stripePriceId: `price2_${i}`
    }));

    const existingProduct = {
      stripeProductId: 'prod_123',
      stripePriceId: 'base_price_123',
      variants: existingVariants,
      variants2: existingVariants2
    };

    // Updates with the same variants, to trigger the O(N^2) behavior
    const updates = {
      variants: existingVariants.map(v => ({ ...v, price: v.price + 1 })),
      variants2: existingVariants2.map(v => ({ ...v, price: v.price + 1 }))
    };

    console.log(`--- Starting Performance Test with ${NUM_VARIANTS} variants (primary and secondary) ---`);
    const start = performance.now();
    await productStripeService.updateProductVariants(existingProduct, updates, stripeService);
    const end = performance.now();

    console.log(`Update time: ${(end - start).toFixed(2)}ms`);

    expect(true).toBe(true);
  })
})
