import { describe, it, expect, vi, afterEach } from 'vitest'
import { goToCheckout, redirectToCheckout } from '../../src/lib/stripe'

describe('goToCheckout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('navigates to the hosted Checkout Session URL', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign } })
    goToCheckout({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' })
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_123')
  })

  it('throws when the session has no URL', () => {
    vi.stubGlobal('window', { location: { assign: vi.fn() } })
    expect(() => goToCheckout({ sessionId: 'cs_test_123' })).toThrow(/Checkout is unavailable/)
  })
})

describe('redirectToCheckout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a session for the price and navigates to its URL', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign } })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: 'cs_test_1', url: 'https://checkout.stripe.com/x' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await redirectToCheckout('price_123')

    expect(fetchMock).toHaveBeenCalledWith('/api/create-checkout-session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ priceId: 'price_123' }),
    }))
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/x')
  })

  it('surfaces the server error message', async () => {
    vi.stubGlobal('window', { location: { assign: vi.fn() } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'This store is not accepting payments yet.' }),
    }))
    await expect(redirectToCheckout('price_123')).rejects.toThrow('This store is not accepting payments yet.')
  })
})
