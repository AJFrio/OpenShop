// Main Cloudflare Worker with Hono framework
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { KVManager } from './lib/kv.js'
import { verifyAdminAuth } from './middleware/auth.js'
import Stripe from 'stripe'

const app = new Hono()

// CORS middleware
app.use('*', cors({
  origin: ['*'], // In production, restrict this to your domain
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Admin-Token'],
}))

// Serve static assets (React build)
app.use('/*', serveStatic({ root: './' }))

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// =====================================
// PUBLIC API ENDPOINTS (Read-only)
// =====================================

// Get all products
app.get('/api/products', async (c) => {
  try {
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const products = await kv.getAllProducts()
    return c.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return c.json({ error: 'Failed to fetch products' }, 500)
  }
})

// Get single product
app.get('/api/products/:id', async (c) => {
  try {
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const product = await kv.getProduct(c.req.param('id'))
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }
    
    return c.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return c.json({ error: 'Failed to fetch product' }, 500)
  }
})

// Get all collections
app.get('/api/collections', async (c) => {
  try {
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const collections = await kv.getAllCollections()
    return c.json(collections)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return c.json({ error: 'Failed to fetch collections' }, 500)
  }
})

// Get single collection
app.get('/api/collections/:id', async (c) => {
  try {
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const collection = await kv.getCollection(c.req.param('id'))
    
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404)
    }
    
    return c.json(collection)
  } catch (error) {
    console.error('Error fetching collection:', error)
    return c.json({ error: 'Failed to fetch collection' }, 500)
  }
})

// Get products in collection
app.get('/api/collections/:id/products', async (c) => {
  try {
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const products = await kv.getProductsByCollection(c.req.param('id'))
    return c.json(products)
  } catch (error) {
    console.error('Error fetching collection products:', error)
    return c.json({ error: 'Failed to fetch collection products' }, 500)
  }
})

// Get store settings
app.get('/api/store-settings', async (c) => {
  try {
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const settings = await kv.namespace.get('store:settings')
    
    const defaultSettings = {
      logoType: 'text',
      logoText: 'OpenShop',
      logoImageUrl: '',
      storeName: 'OpenShop',
      storeDescription: 'Your amazing online store',
    }
    
    if (settings) {
      return c.json(JSON.parse(settings))
    } else {
      return c.json(defaultSettings)
    }
  } catch (error) {
    console.error('Error fetching store settings:', error)
    return c.json({ error: 'Failed to fetch store settings' }, 500)
  }
})

// Create Stripe checkout session (single item)
app.post('/api/create-checkout-session', async (c) => {
  try {
    const { priceId } = await c.req.json()
    
    if (!priceId) {
      return c.json({ error: 'Price ID is required' }, 400)
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${c.env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.env.SITE_URL}/`,
    })

    return c.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

// Create Stripe checkout session (cart)
app.post('/api/create-cart-checkout-session', async (c) => {
  try {
    const { items } = await c.req.json()
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Cart items are required' }, 400)
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)
    const lineItems = items.map(item => ({
      price: item.stripePriceId,
      quantity: item.quantity,
    }))

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${c.env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.env.SITE_URL}/`,
      metadata: {
        order_type: 'cart_checkout',
        item_count: items.length.toString(),
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      },
    })

    return c.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating cart checkout session:', error)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

// =====================================
// ADMIN API ENDPOINTS (Authenticated)
// =====================================

// Admin authentication middleware
app.use('/api/admin/*', async (c, next) => {
  // Skip auth for login endpoint
  if (c.req.path === '/api/admin/login') {
    return next()
  }

  const authResult = await verifyAdminAuth(c.req, c.env)
  if (!authResult.isValid) {
    return c.json({ error: authResult.error }, authResult.status)
  }

  return next()
})

// Admin login
app.post('/api/admin/login', async (c) => {
  try {
    const { password } = await c.req.json()
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
    
    if (password !== adminPassword) {
      return c.json({ error: 'Invalid password' }, 401)
    }

    const token = btoa(Date.now() + Math.random().toString(36)).replace(/[^a-zA-Z0-9]/g, '')
    
    await c.env.OPENSHOP_KV.put(`admin_token:${token}`, Date.now().toString(), {
      expirationTtl: 86400 // 24 hours
    })

    return c.json({ token })
  } catch (error) {
    console.error('Admin login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Admin create product
app.post('/api/admin/products', async (c) => {
  try {
    const productData = await c.req.json()
    const kv = new KVManager(c.env.OPENSHOP_KV)
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const stripeImages = Array.isArray(productData.images) ? productData.images : 
                        (productData.imageUrl ? [productData.imageUrl] : [])
    
    const stripeProduct = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      images: stripeImages.slice(0, 8),
    })

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(productData.price * 100),
      currency: productData.currency,
      product: stripeProduct.id,
    })

    const product = {
      ...productData,
      stripePriceId: stripePrice.id,
      stripeProductId: stripeProduct.id,
    }

    const savedProduct = await kv.createProduct(product)
    return c.json(savedProduct, 201)
  } catch (error) {
    console.error('Error creating product:', error)
    return c.json({ error: 'Failed to create product' }, 500)
  }
})

// Admin update store settings
app.put('/api/admin/store-settings', async (c) => {
  try {
    const settings = await c.req.json()
    const kv = new KVManager(c.env.OPENSHOP_KV)

    // Validation
    if (!settings.logoType || !['text', 'image'].includes(settings.logoType)) {
      return c.json({ error: 'Invalid logoType. Must be "text" or "image"' }, 400)
    }

    const defaultSettings = {
      logoType: 'text',
      logoText: 'OpenShop',
      logoImageUrl: '',
      storeName: 'OpenShop',
      storeDescription: 'Your amazing online store',
    }

    const updatedSettings = { ...defaultSettings, ...settings }
    await kv.namespace.put('store:settings', JSON.stringify(updatedSettings))

    return c.json(updatedSettings)
  } catch (error) {
    console.error('Error updating store settings:', error)
    return c.json({ error: 'Failed to update store settings' }, 500)
  }
})

// Analytics endpoint
app.get('/api/analytics', async (c) => {
  try {
    const period = c.req.query('period') || '30d'
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const now = new Date()
    const periodDays = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = periodDays[period] || 30
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: Math.floor(startDate.getTime() / 1000) },
      limit: 100,
    })

    const successfulPayments = paymentIntents.data.filter(pi => pi.status === 'succeeded')
    const totalRevenue = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100
    const totalOrders = successfulPayments.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Create chart data
    const chartData = []
    const dailyData = {}
    const revenueByDate = {}
    
    successfulPayments.forEach(payment => {
      const date = new Date(payment.created * 1000).toISOString().split('T')[0]
      dailyData[date] = (dailyData[date] || 0) + 1
      revenueByDate[date] = (revenueByDate[date] || 0) + (payment.amount / 100)
    })

    const currentDate = new Date(startDate)
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0]
      chartData.push({
        date: dateStr,
        orders: dailyData[dateStr] || 0,
        revenue: revenueByDate[dateStr] || 0,
        formattedDate: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return c.json({
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      chartData,
      recentOrders: [], // Simplified for this implementation
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

// Fallback route - serve React app for all non-API routes
app.get('*', serveStatic({ path: './index.html' }))

export default app
