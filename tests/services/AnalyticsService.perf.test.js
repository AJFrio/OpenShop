import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyticsService } from '../../src/services/AnalyticsService.js'

// Mock KV
class MockKV {
  constructor() {
    this.store = new Map()
  }
  async get(key) {
    return this.store.get(key)
  }
  async put(key, value) {
    this.store.set(key, value)
  }
}

// Mock Stripe Service
class MockStripeService {
  constructor() {
    this.stripe = {
        paymentIntents: {
            list: async () => ({ data: [] })
        }
    }
  }

  async listPaymentIntents(startDate) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50))
    return {
      data: Array(10).fill(0).map((_, i) => ({
        id: `pi_${i}`,
        status: 'succeeded',
        amount: 1000,
        created: Math.floor(Date.now() / 1000)
      }))
    }
  }
}

describe('AnalyticsService Performance', () => {
  let stripeService
  let analyticsService
  let kv

  beforeEach(() => {
    vi.clearAllMocks()
    stripeService = new MockStripeService()
    kv = new MockKV()

    // We spy on the method to count calls
    vi.spyOn(stripeService, 'listPaymentIntents')

    // Initialize service
    // Note: kv is passed but currently ignored by AnalyticsService
    analyticsService = new AnalyticsService(stripeService, kv)
  })

  it('should verify cache behavior', async () => {
    console.log('--- Starting Performance Test ---')

    const start1 = performance.now()
    await analyticsService.getAnalytics('30d')
    const end1 = performance.now()
    const time1 = end1 - start1

    const start2 = performance.now()
    await analyticsService.getAnalytics('30d')
    const end2 = performance.now()
    const time2 = end2 - start2

    console.log(`Call 1 time: ${time1.toFixed(2)}ms`)
    console.log(`Call 2 time: ${time2.toFixed(2)}ms`)

    // With caching, the first call hits Stripe, the second hits cache.
    // So we expect 1 call to Stripe.
    expect(stripeService.listPaymentIntents).toHaveBeenCalledTimes(1)
  })
})
