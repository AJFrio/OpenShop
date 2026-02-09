// Admin analytics routes
import { Hono } from 'hono'
import { AnalyticsService } from '../../services/AnalyticsService.js'
import { StripeService } from '../../services/StripeService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// Get analytics
router.get('/', asyncHandler(async (c) => {
  const period = c.req.query('period') || '30d'
  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const kvNamespace = getKVNamespace(c.env)
  const analyticsService = new AnalyticsService(stripeService, kvNamespace)
  const analytics = await analyticsService.getAnalytics(period)
  return c.json(analytics)
}))

// Get orders
router.get('/orders', asyncHandler(async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '25', 10), 50)
  const direction = c.req.query('direction') || 'next'
  const cursor = c.req.query('cursor') || undefined
  const showFulfilled = c.req.query('showFulfilled') === 'true'

  const stripeService = new StripeService(c.env.STRIPE_SECRET_KEY, c.env.SITE_URL)
  const analyticsService = new AnalyticsService(stripeService)
  const kvNamespace = getKVNamespace(c.env)

  const orders = await analyticsService.getOrders({
    limit,
    direction,
    cursor,
    showFulfilled,
    kvNamespace
  })

  return c.json(orders)
}))

// Mark order as fulfilled
router.post('/orders/:orderId/fulfill', asyncHandler(async (c) => {
  const orderId = c.req.param('orderId')
  const kvNamespace = getKVNamespace(c.env)
  
  if (!kvNamespace) {
    throw new Error('KV namespace not available')
  }

  const fulfillmentKey = `order_fulfillment:${orderId}`
  const fulfillmentData = {
    fulfilled: true,
    fulfilledAt: new Date().toISOString(),
    fulfilledBy: 'admin'
  }

  await kvNamespace.put(fulfillmentKey, JSON.stringify(fulfillmentData))
  return c.json({ success: true, fulfillment: fulfillmentData })
}))

export default router

