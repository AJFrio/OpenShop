import { describe, it, expect } from 'vitest'
import { buildCheckoutItems } from '../../src/lib/checkoutPayload'

describe('buildCheckoutItems', () => {
  it('includes quantity for single-item carts instead of dropping it', () => {
    const items = [
      { id: 'p1', name: 'Tee', price: 24, quantity: 5, stripePriceId: 'price_aaa' },
    ]
    expect(buildCheckoutItems(items)).toEqual([
      { priceId: 'price_aaa', quantity: 5 },
    ])
  })

  it('maps multi-item carts to priceId+quantity pairs', () => {
    const items = [
      { id: 'p1', name: 'Tee', quantity: 2, stripePriceId: 'price_aaa' },
      { id: 'p2', name: 'Mug', quantity: 1, stripePriceId: 'price_bbb' },
    ]
    expect(buildCheckoutItems(items)).toEqual([
      { priceId: 'price_aaa', quantity: 2 },
      { priceId: 'price_bbb', quantity: 1 },
    ])
  })

  it('defaults quantity to 1 when missing', () => {
    const items = [{ id: 'p1', stripePriceId: 'price_aaa' }]
    expect(buildCheckoutItems(items)).toEqual([
      { priceId: 'price_aaa', quantity: 1 },
    ])
  })

  it('drops items without a stripePriceId', () => {
    const items = [
      { id: 'p1', stripePriceId: 'price_aaa', quantity: 2 },
      { id: 'p2', quantity: 3 },
    ]
    expect(buildCheckoutItems(items)).toEqual([
      { priceId: 'price_aaa', quantity: 2 },
    ])
  })
})
