// Public checkout routes
import { Hono } from 'hono'
import { StripeService } from '../../services/StripeService.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// Create checkout session (single item)
router.post('/create-checkout-session', asyncHandler(async (c) => {
  const { priceId } = await c.req.json()
  
  // Validate and trim priceId
  if (!priceId || typeof priceId !== 'string') {
    throw new ValidationError('Valid price ID is required')
  }
  
  const trimmedPriceId = priceId.trim()
  
  if (trimmedPriceId.length === 0) {
    throw new ValidationError('Valid price ID is required')
  }
  
  // Validate priceId format (Stripe price IDs start with price_)
  if (!trimmedPriceId.startsWith('price_')) {
    throw new ValidationError('Invalid price ID format')
  }
  
  // Limit priceId length to prevent DoS
  if (trimmedPriceId.length > 255) {
    throw new ValidationError('Price ID is too long')
  }

  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const session = await stripeService.createCheckoutSession(trimmedPriceId)
  return c.json({ sessionId: session.id })
}))

// Create cart checkout session
router.post('/create-cart-checkout-session', asyncHandler(async (c) => {
  const { items } = await c.req.json()
  
  // Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Cart items are required')
  }
  
  // Limit cart size to prevent DoS
  if (items.length > 100) {
    throw new ValidationError('Cart size exceeds maximum allowed items')
  }
  
  // Validate and normalize each item
  const normalizedItems = items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`Invalid cart item format at index ${index}`)
    }
    
    // Support both priceId and stripePriceId (for backward compatibility)
    const priceId = item.stripePriceId || item.priceId
    if (!priceId || typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      throw new ValidationError(`Invalid price ID in cart item at index ${index}`)
    }
    
    // Validate and normalize quantity
    let quantity = item.quantity
    if (quantity === undefined || quantity === null) {
      quantity = 1
    }
    
    // Convert to integer if it's a number string
    quantity = Number.parseInt(quantity, 10)
    
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new ValidationError(`Invalid quantity in cart item at index ${index} (must be 1-100, got ${quantity})`)
    }
    
    // Return normalized item
    return {
      ...item,
      stripePriceId: priceId.trim(),
      quantity: quantity
    }
  })

  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const session = await stripeService.createCartCheckoutSession(normalizedItems)
  return c.json({ sessionId: session.id })
}))

// Get checkout session details
router.get('/checkout-session/:sessionId', asyncHandler(async (c) => {
  const sessionId = c.req.param('sessionId')
  
  // Validate and trim sessionId
  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Invalid session ID format')
  }
  
  const trimmedSessionId = sessionId.trim()
  
  // Validate sessionId format (Stripe session IDs start with cs_)
  if (!trimmedSessionId.startsWith('cs_')) {
    throw new ValidationError('Invalid session ID format')
  }
  
  // Limit sessionId length to prevent DoS
  if (trimmedSessionId.length > 255) {
    throw new ValidationError('Session ID is too long')
  }
  
  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const session = await stripeService.getCheckoutSession(trimmedSessionId)
  return c.json(session)
}))

export default router

