// Stripe service - handles Stripe operations
import Stripe from 'stripe'
import { SHIPPING_COUNTRIES } from '../config/index.js'

export class StripeService {
  constructor(secretKey, siteUrl) {
    this.stripe = new Stripe(secretKey)
    this.siteUrl = siteUrl
  }

  /**
   * Create a Stripe product
   */
  async createProduct(productData) {
    const stripeImages = Array.isArray(productData.images) 
      ? productData.images 
      : (productData.imageUrl ? [productData.imageUrl] : [])
    
    const productParams = {
      name: productData.name,
      images: stripeImages.slice(0, 8),
      type: 'good',
      tax_code: 'txcd_99999999', // Physical goods tax code
    }
    
    if (productData.description && String(productData.description).trim() !== '') {
      productParams.description = String(productData.description)
    }
    
    return await this.stripe.products.create(productParams)
  }

  /**
   * Update a Stripe product
   */
  async updateProduct(productId, updates) {
    const updateParams = {
      name: updates.name,
      images: updates.images?.slice(0, 8) || [],
    }
    
    if (typeof updates.description === 'string') {
      const trimmed = updates.description.trim()
      if (trimmed) {
        updateParams.description = trimmed
      }
    }
    
    return await this.stripe.products.update(productId, updateParams)
  }

  /**
   * Archive a Stripe product
   */
  async archiveProduct(productId) {
    return await this.stripe.products.update(productId, { active: false })
  }

  /**
   * Create a Stripe price
   */
  async createPrice(params) {
    return await this.stripe.prices.create({
      unit_amount: Math.round(params.amount * 100),
      currency: params.currency,
      product: params.productId,
      nickname: params.nickname,
      metadata: params.metadata || {},
    })
  }

  /**
   * Archive a Stripe price
   */
  async archivePrice(priceId) {
    return await this.stripe.prices.update(priceId, { active: false })
  }

  /**
   * Create checkout session for single item
   */
  async createCheckoutSession(priceId) {
    return await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: SHIPPING_COUNTRIES,
      },
      billing_address_collection: 'required',
      success_url: `${this.siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.siteUrl}/`,
    })
  }

  /**
   * Create checkout session for cart
   */
  async createCartCheckoutSession(items) {
    const lineItems = items.map(item => {
      // When using price IDs, you cannot set description, name, images, etc. directly
      // These must come from the price object itself
      const lineItem = {
        price: item.stripePriceId,
        quantity: item.quantity || 1,
      }

      // Note: Description, name, and images are not allowed when using price IDs
      // If you need custom descriptions, you would need to use price_data instead
      // For now, we'll rely on the product information stored in Stripe

      return lineItem
    })

    // Build metadata with variant information
    const metadata = {
      order_type: 'cart_checkout',
      item_count: items.length.toString(),
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0).toString(),
    }

    // Add variant information to metadata for each item
    items.forEach((item, index) => {
      const itemName = item.name || `Item ${index + 1}`
      metadata[`item_${index}_name`] = itemName
      if (item.selectedVariant?.name) {
        metadata[`item_${index}_variant1`] = item.selectedVariant.name
      }
      if (item.selectedVariant2?.name) {
        metadata[`item_${index}_variant2`] = item.selectedVariant2.name
      }
    })

    return await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: SHIPPING_COUNTRIES,
      },
      billing_address_collection: 'required',
      success_url: `${this.siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.siteUrl}/`,
      metadata,
    })
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId)
    return {
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status,
      created: session.created
    }
  }

  /**
   * List checkout sessions with pagination
   */
  async listCheckoutSessions(options = {}) {
    const params = {
      limit: Math.min(options.limit || 25, 50),
    }
    
    if (options.cursor) {
      if (options.direction === 'prev') {
        params.ending_before = options.cursor
      } else {
        params.starting_after = options.cursor
      }
    }
    
    return await this.stripe.checkout.sessions.list(params)
  }

  /**
   * Get line items for a checkout session
   */
  async getCheckoutSessionLineItems(sessionId) {
    return await this.stripe.checkout.sessions.listLineItems(sessionId, { 
      limit: 100, 
      expand: ['data.price'] 
    })
  }

  /**
   * Get payment intent with shipping details
   */
  async getPaymentIntent(paymentIntentId) {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['shipping']
    })
  }

  /**
   * List payment intents for analytics
   */
  async listPaymentIntents(startDate) {
    return await this.stripe.paymentIntents.list({
      created: { gte: Math.floor(startDate.getTime() / 1000) },
      limit: 100,
    })
  }
}

