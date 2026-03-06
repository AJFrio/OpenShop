import { describe, it, expect } from 'vitest'
import { ProductStripeService } from '../../src/services/ProductStripeService.js'

describe('ProductStripeService Performance', () => {
  it('measures updateProductVariants performance with many variants', async () => {
    const mockStripeService = {
      createPrice: async (data) => ({ id: `price_${Math.random()}` }),
      archivePrice: async (id) => {}
    }
    const service = new ProductStripeService(mockStripeService)

    // Generate large number of variants
    const numVariants = 15000;
    const existingVariants = []
    const incomingVariants = []

    for (let i = 0; i < numVariants; i++) {
      existingVariants.push({
        id: `var_${i}`,
        name: `Variant ${i}`,
        stripePriceId: `price_${i}`,
        hasCustomPrice: true,
        price: 10 + i
      })

      // Some with same price, some with different price
      incomingVariants.push({
        id: `var_${i}`,
        name: `Variant ${i}`,
        hasCustomPrice: true,
        price: i % 2 === 0 ? 10 + i : 20 + i // half same, half different
      })
    }

    const existingProduct = {
      stripeProductId: 'prod_123',
      stripePriceId: 'base_price',
      currency: 'usd',
      name: 'Test Product',
      variants: existingVariants,
      variants2: existingVariants // Duplicate for variants2 as well
    }

    const updates = {
      variants: incomingVariants,
      variants2: incomingVariants
    }

    const start = performance.now()
    await service.updateProductVariants(existingProduct, updates, mockStripeService)
    const end = performance.now()

    const duration = end - start
    console.log(`Update Product Variants (${numVariants} variants x 2 groups): ${duration.toFixed(2)}ms`)

    expect(duration).toBeDefined()
  })
})
