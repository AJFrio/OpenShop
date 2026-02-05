
import { ProductStripeService } from '../src/services/ProductStripeService.js';
import { performance } from 'perf_hooks';

// Mock StripeService
class MockStripeService {
  constructor() {
    this.prices = new Map();
    this.callCount = 0;
  }

  async createPrice(params) {
    this.callCount++;
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    const id = `price_${Math.random().toString(36).substr(2, 9)}`;
    const price = {
      id,
      active: true,
      unit_amount: Math.round(params.amount * 100),
      currency: params.currency,
      product: params.productId,
      nickname: params.nickname,
      metadata: params.metadata
    };
    this.prices.set(id, price);
    return price;
  }

  async archivePrice(priceId) {
    this.callCount++;
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.prices.has(priceId)) {
      this.prices.get(priceId).active = false;
    }
    return { id: priceId, active: false };
  }
}

async function runBenchmark() {
  const mockStripe = new MockStripeService();
  const service = new ProductStripeService(mockStripe);

  // Setup test data
  // We want to simulate a scenario where many variants are updated and require price changes
  const variantCount = 10;

  const existingProduct = {
    id: 'prod_123',
    name: 'Test Product',
    currency: 'usd',
    stripeProductId: 'prod_stripe_123',
    variants: [],
    variants2: []
  };

  // Create initial state with existing custom prices
  for (let i = 0; i < variantCount; i++) {
    const priceId = `price_old_${i}`;
    mockStripe.prices.set(priceId, {
      id: priceId,
      active: true,
      unit_amount: 1000, // $10.00
      currency: 'usd'
    });

    existingProduct.variants.push({
      id: `var_${i}`,
      name: `Variant ${i}`,
      hasCustomPrice: true,
      price: 10.00,
      stripePriceId: priceId
    });
  }

  // Create updates where every variant changes price
  // This triggers: 1 createPrice + 1 archivePrice per variant
  const updates = {
    name: 'Test Product Updated',
    variants: existingProduct.variants.map((v, i) => ({
      ...v,
      price: 20.00 // Changed price -> triggers update
    })),
    variants2: []
  };

  console.log(`Starting benchmark with ${variantCount} variants...`);
  console.log('Each variant update triggers createPrice (50ms) and archivePrice (50ms).');

  const start = performance.now();

  await service.updateProductVariants(existingProduct, updates, mockStripe);

  const end = performance.now();
  const duration = end - start;

  console.log(`\nBenchmark finished.`);
  console.log(`Total time: ${duration.toFixed(2)}ms`);
  console.log(`Stripe calls: ${mockStripe.callCount}`);

  // Theoretical sequential time: 10 * (50 + 50) = 1000ms
  // Theoretical parallel time (if fully parallel): 50 + 50 = 100ms
  // (Assuming create and archive are sequential per variant, but variants are processed in parallel)
}

runBenchmark().catch(console.error);
