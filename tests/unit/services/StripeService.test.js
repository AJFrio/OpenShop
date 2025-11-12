// Unit tests for StripeService
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StripeService } from '../../../src/services/StripeService.js'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const mockProducts = {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn()
  }

  const mockPrices = {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn()
  }

  const mockCheckoutSessions = {
    create: vi.fn(),
    retrieve: vi.fn(),
    list: vi.fn(),
    listLineItems: vi.fn()
  }

  const mockPaymentIntents = {
    retrieve: vi.fn(),
    list: vi.fn()
  }

  return {
    default: vi.fn(() => ({
      products: mockProducts,
      prices: mockPrices,
      checkout: {
        sessions: mockCheckoutSessions
      },
      paymentIntents: mockPaymentIntents
    }))
  }
})

describe('StripeService', () => {
  let stripeService
  let mockStripe

  beforeEach(() => {
    stripeService = new StripeService('sk_test_mock', 'https://test.workers.dev')
    mockStripe = new Stripe('sk_test_mock')
    vi.clearAllMocks()
  })

  describe('createProduct', () => {
    it('should create a Stripe product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        images: ['https://example.com/image.jpg']
      }

      const mockProduct = { id: 'prod_test123', ...productData }
      mockStripe.products.create.mockResolvedValue(mockProduct)

      const result = await stripeService.createProduct(productData)

      expect(result).toEqual(mockProduct)
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: 'Test Product',
        description: 'Test description',
        images: ['https://example.com/image.jpg'],
        type: 'good',
        tax_code: 'txcd_99999999'
      })
    })

    it('should handle products without description', async () => {
      const productData = {
        name: 'Test Product',
        images: []
      }

      const mockProduct = { id: 'prod_test123' }
      mockStripe.products.create.mockResolvedValue(mockProduct)

      await stripeService.createProduct(productData)

      expect(mockStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          images: []
        })
      )
    })

    it('should limit images to 8', async () => {
      const productData = {
        name: 'Test Product',
        images: Array.from({ length: 10 }, (_, i) => `https://example.com/image${i}.jpg`)
      }

      mockStripe.products.create.mockResolvedValue({ id: 'prod_test123' })

      await stripeService.createProduct(productData)

      expect(mockStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: expect.arrayContaining([])
        })
      )
      const callArgs = mockStripe.products.create.mock.calls[0][0]
      expect(callArgs.images.length).toBeLessThanOrEqual(8)
    })

    it('should handle imageUrl instead of images array', async () => {
      const productData = {
        name: 'Test Product',
        imageUrl: 'https://example.com/image.jpg'
      }

      mockStripe.products.create.mockResolvedValue({ id: 'prod_test123' })

      await stripeService.createProduct(productData)

      expect(mockStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['https://example.com/image.jpg']
        })
      )
    })
  })

  describe('updateProduct', () => {
    it('should update a Stripe product', async () => {
      const updates = {
        name: 'Updated Product',
        images: ['https://example.com/new-image.jpg']
      }

      const mockProduct = { id: 'prod_test123', ...updates }
      mockStripe.products.update.mockResolvedValue(mockProduct)

      const result = await stripeService.updateProduct('prod_test123', updates)

      expect(result).toEqual(mockProduct)
      expect(mockStripe.products.update).toHaveBeenCalledWith('prod_test123', {
        name: 'Updated Product',
        images: ['https://example.com/new-image.jpg']
      })
    })

    it('should handle description updates', async () => {
      const updates = {
        name: 'Updated Product',
        description: 'Updated description'
      }

      mockStripe.products.update.mockResolvedValue({ id: 'prod_test123' })

      await stripeService.updateProduct('prod_test123', updates)

      expect(mockStripe.products.update).toHaveBeenCalledWith(
        'prod_test123',
        expect.objectContaining({
          description: 'Updated description'
        })
      )
    })

    it('should not include empty description', async () => {
      const updates = {
        name: 'Updated Product',
        description: '   '
      }

      mockStripe.products.update.mockResolvedValue({ id: 'prod_test123' })

      await stripeService.updateProduct('prod_test123', updates)

      const callArgs = mockStripe.products.update.mock.calls[0][1]
      expect(callArgs.description).toBeUndefined()
    })
  })

  describe('archiveProduct', () => {
    it('should archive a Stripe product', async () => {
      mockStripe.products.update.mockResolvedValue({ id: 'prod_test123', active: false })

      await stripeService.archiveProduct('prod_test123')

      expect(mockStripe.products.update).toHaveBeenCalledWith('prod_test123', { active: false })
    })
  })

  describe('createPrice', () => {
    it('should create a Stripe price', async () => {
      const params = {
        amount: 29.99,
        currency: 'usd',
        productId: 'prod_test123',
        nickname: 'Test Price',
        metadata: {}
      }

      const mockPrice = { id: 'price_test123', ...params }
      mockStripe.prices.create.mockResolvedValue(mockPrice)

      const result = await stripeService.createPrice(params)

      expect(result).toEqual(mockPrice)
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        unit_amount: 2999, // Converted to cents
        currency: 'usd',
        product: 'prod_test123',
        nickname: 'Test Price',
        metadata: {}
      })
    })

    it('should convert amount to cents', async () => {
      const params = {
        amount: 19.99,
        currency: 'usd',
        productId: 'prod_test123',
        nickname: 'Test'
      }

      mockStripe.prices.create.mockResolvedValue({ id: 'price_test123' })

      await stripeService.createPrice(params)

      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_amount: 1999
        })
      )
    })
  })

  describe('archivePrice', () => {
    it('should archive a Stripe price', async () => {
      mockStripe.prices.update.mockResolvedValue({ id: 'price_test123', active: false })

      await stripeService.archivePrice('price_test123')

      expect(mockStripe.prices.update).toHaveBeenCalledWith('price_test123', { active: false })
    })
  })

  describe('createCheckoutSession', () => {
    it('should create a checkout session for single item', async () => {
      const priceId = 'price_test123'
      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test'
      }

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const result = await stripeService.createCheckoutSession(priceId)

      expect(result).toEqual(mockSession)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        shipping_address_collection: expect.any(Object),
        billing_address_collection: 'required',
        success_url: expect.stringContaining('/success'),
        cancel_url: expect.stringContaining('/')
      })
    })
  })

  describe('createCartCheckoutSession', () => {
    it('should create a checkout session for cart', async () => {
      const items = [
        { stripePriceId: 'price_1', quantity: 2 },
        { stripePriceId: 'price_2', quantity: 1 }
      ]

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test'
      }

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const result = await stripeService.createCartCheckoutSession(items)

      expect(result).toEqual(mockSession)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: 'price_1', quantity: 2 },
            { price: 'price_2', quantity: 1 }
          ],
          mode: 'payment',
          metadata: expect.objectContaining({
            order_type: 'cart_checkout',
            item_count: '2',
            total_quantity: '3'
          })
        })
      )
    })

    it('should include variant information in metadata', async () => {
      const items = [
        {
          stripePriceId: 'price_1',
          quantity: 1,
          name: 'Product 1',
          selectedVariant: { name: 'Size: Large' },
          selectedVariant2: { name: 'Color: Red' }
        }
      ]

      mockStripe.checkout.sessions.create.mockResolvedValue({ id: 'cs_test123' })

      await stripeService.createCartCheckoutSession(items)

      const callArgs = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(callArgs.metadata.item_0_name).toBe('Product 1')
      expect(callArgs.metadata.item_0_variant1).toBe('Size: Large')
      expect(callArgs.metadata.item_0_variant2).toBe('Color: Red')
    })
  })

  describe('getCheckoutSession', () => {
    it('should retrieve checkout session details', async () => {
      const sessionId = 'cs_test123'
      const mockSession = {
        id: sessionId,
        amount_total: 2999,
        currency: 'usd',
        customer_details: { email: 'test@example.com' },
        payment_status: 'paid',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession)

      const result = await stripeService.getCheckoutSession(sessionId)

      expect(result).toEqual({
        id: sessionId,
        amount_total: 2999,
        currency: 'usd',
        customer_email: 'test@example.com',
        payment_status: 'paid',
        created: expect.any(Number)
      })
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(sessionId)
    })
  })

  describe('listCheckoutSessions', () => {
    it('should list checkout sessions with pagination', async () => {
      const mockSessions = {
        data: [{ id: 'cs_1' }, { id: 'cs_2' }],
        has_more: false
      }

      mockStripe.checkout.sessions.list.mockResolvedValue(mockSessions)

      const result = await stripeService.listCheckoutSessions({ limit: 25 })

      expect(result).toEqual(mockSessions)
      expect(mockStripe.checkout.sessions.list).toHaveBeenCalledWith({
        limit: 25
      })
    })

    it('should handle cursor pagination', async () => {
      mockStripe.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false })

      await stripeService.listCheckoutSessions({
        limit: 25,
        cursor: 'cs_cursor',
        direction: 'next'
      })

      expect(mockStripe.checkout.sessions.list).toHaveBeenCalledWith({
        limit: 25,
        starting_after: 'cs_cursor'
      })
    })

    it('should enforce maximum limit of 50', async () => {
      mockStripe.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false })

      await stripeService.listCheckoutSessions({ limit: 100 })

      expect(mockStripe.checkout.sessions.list).toHaveBeenCalledWith({
        limit: 50
      })
    })
  })

  describe('getCheckoutSessionLineItems', () => {
    it('should retrieve line items for a session', async () => {
      const sessionId = 'cs_test123'
      const mockLineItems = {
        data: [
          { id: 'li_1', price: { id: 'price_1' } }
        ]
      }

      mockStripe.checkout.sessions.listLineItems.mockResolvedValue(mockLineItems)

      const result = await stripeService.getCheckoutSessionLineItems(sessionId)

      expect(result).toEqual(mockLineItems)
      expect(mockStripe.checkout.sessions.listLineItems).toHaveBeenCalledWith(
        sessionId,
        {
          limit: 100,
          expand: ['data.price']
        }
      )
    })
  })

  describe('getPaymentIntent', () => {
    it('should retrieve payment intent with shipping', async () => {
      const paymentIntentId = 'pi_test123'
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: 2999,
        shipping: { address: { city: 'New York' } }
      }

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)

      const result = await stripeService.getPaymentIntent(paymentIntentId)

      expect(result).toEqual(mockPaymentIntent)
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(
        paymentIntentId,
        { expand: ['shipping'] }
      )
    })
  })

  describe('listPaymentIntents', () => {
    it('should list payment intents from a start date', async () => {
      const startDate = new Date('2024-01-01')
      const mockPaymentIntents = {
        data: [{ id: 'pi_1' }, { id: 'pi_2' }]
      }

      mockStripe.paymentIntents.list.mockResolvedValue(mockPaymentIntents)

      const result = await stripeService.listPaymentIntents(startDate)

      expect(result).toEqual(mockPaymentIntents)
      expect(mockStripe.paymentIntents.list).toHaveBeenCalledWith({
        created: { gte: Math.floor(startDate.getTime() / 1000) },
        limit: 100
      })
    })
  })
})



