// Main Cloudflare Worker with Hono framework
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { KVManager } from './lib/kv.js'
import { verifyAdminAuth } from './middleware/auth.js'
import Stripe from 'stripe'

// Helper function to get KV namespace dynamically
function getKVNamespace(env) {
  console.log('Available env bindings:', Object.keys(env))
  
  // Try direct access to known binding names first
  const possibleBindings = [
    'OPENSHOP-TEST3_KV',
    'OPENSHOP_TEST3_KV', 
    'OPENSHOP_KV'
  ]
  
  for (const bindingName of possibleBindings) {
    // Use bracket notation for property names with hyphens
    if (bindingName in env && env[bindingName]) {
      console.log(`Found KV namespace via direct access: ${bindingName}`)
      const kvNamespace = env[bindingName]
      console.log('KV namespace object:', !!kvNamespace, typeof kvNamespace)
      console.log('KV namespace has get method:', typeof kvNamespace?.get)
      return kvNamespace
    }
  }
  
  // Look for KV namespace by checking for KV-like binding names
  const kvBindingName = Object.keys(env).find(key => 
    key.endsWith('_KV') || key.endsWith('-KV') || key.includes('KV')
  )
  
  console.log('Found KV binding name via search:', kvBindingName)
  
  if (kvBindingName) {
    const kvNamespace = env[kvBindingName]
    console.log('KV namespace object via search:', !!kvNamespace, typeof kvNamespace)
    if (kvNamespace) {
      return kvNamespace
    }
  }
  
  // Fallback: look for any binding with get/put methods
  const kvNamespace = Object.values(env).find(binding => 
    binding && typeof binding.get === 'function' && typeof binding.put === 'function'
  )
  console.log('Fallback KV namespace found:', !!kvNamespace)
  
  if (!kvNamespace) {
    console.error('No KV namespace found! Available bindings:', Object.keys(env))
    console.error('Environment values:', Object.values(env).map(v => typeof v))
  }
  
  return kvNamespace
}

const app = new Hono()

// CORS middleware
app.use('*', cors({
  origin: ['*'], // In production, restrict this to your domain
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Admin-Token'],
}))

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
    const kv = new KVManager(getKVNamespace(c.env))
    const products = await kv.getAllProducts()
    const visible = products.filter(p => !p.archived)
    return c.json(visible)
  } catch (error) {
    console.error('Error fetching products:', error)
    return c.json({ error: 'Failed to fetch products' }, 500)
  }
})

// Get single product
app.get('/api/products/:id', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
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
    const kv = new KVManager(getKVNamespace(c.env))
    const collections = await kv.getAllCollections()
    const visible = collections.filter(col => !col.archived)
    return c.json(visible)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return c.json({ error: 'Failed to fetch collections' }, 500)
  }
})

// Get single collection
app.get('/api/collections/:id', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
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
    const kv = new KVManager(getKVNamespace(c.env))
    const products = await kv.getProductsByCollection(c.req.param('id'))
    // If collection is archived, hide all products in that collection regardless of product flag
    const collection = await kv.getCollection(c.req.param('id'))
    const visible = (collection && collection.archived)
      ? []
      : products.filter(p => !p.archived)
    return c.json(visible)
  } catch (error) {
    console.error('Error fetching collection products:', error)
    return c.json({ error: 'Failed to fetch collection products' }, 500)
  }
})

// Get store settings
app.get('/api/store-settings', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
    const settings = await kv.namespace.get('store:settings')
    
    const defaultSettings = {
      logoType: 'text',
      logoText: 'OpenShop',
      logoImageUrl: '',
      storeName: 'OpenShop',
      storeDescription: 'Your amazing online store',
      heroImageUrl: '',
      heroTitle: 'Welcome to OpenShop',
      heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.',
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

// Get checkout session details (for success page)
app.get('/api/checkout-session/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    return c.json({
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status,
      created: session.created
    })
  } catch (error) {
    console.error('Error fetching checkout session:', error)
    return c.json({ error: 'Failed to fetch checkout session' }, 500)
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

  try {
    const authResult = await verifyAdminAuth(c.req, c.env)
    if (!authResult.isValid) {
      console.error('Auth failed:', authResult.error)
      return c.json({ error: authResult.error }, authResult.status)
    }

    return next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication middleware failed' }, 500)
  }
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
    
    await getKVNamespace(c.env).put(`admin_token:${token}`, Date.now().toString(), {
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
    const kv = new KVManager(getKVNamespace(c.env))
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

// Admin create collection
app.post('/api/admin/collections', async (c) => {
  try {
    console.log('Creating collection - starting')
    const collectionData = await c.req.json()
    console.log('Collection data received:', collectionData)
    
    const kvNamespace = getKVNamespace(c.env)
    if (!kvNamespace) {
      console.error('KV namespace not found in environment')
      return c.json({ error: 'KV namespace not configured' }, 500)
    }
    console.log('KV namespace found')
    
    const kv = new KVManager(kvNamespace)
    console.log('KVManager created')
    
    const savedCollection = await kv.createCollection(collectionData)
    console.log('Collection saved:', savedCollection)
    
    return c.json(savedCollection, 201)
  } catch (error) {
    console.error('Error creating collection:', error)
    console.error('Error stack:', error.stack)
    return c.json({ 
      error: 'Failed to create collection', 
      details: error.message,
      stack: error.stack 
    }, 500)
  }
})

// Admin update collection
app.put('/api/admin/collections/:id', async (c) => {
  try {
    const updates = await c.req.json()
    const kv = new KVManager(getKVNamespace(c.env))

    const updatedCollection = await kv.updateCollection(c.req.param('id'), updates)
    return c.json(updatedCollection)
  } catch (error) {
    console.error('Error updating collection:', error)
    return c.json({ error: 'Failed to update collection' }, 500)
  }
})

// Admin list collections (include archived)
app.get('/api/admin/collections', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
    const collections = await kv.getAllCollections()
    return c.json(collections)
  } catch (error) {
    console.error('Error listing admin collections:', error)
    return c.json({ error: 'Failed to list collections' }, 500)
  }
})

// Admin delete collection
app.delete('/api/admin/collections/:id', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))

    const existingCollection = await kv.getCollection(c.req.param('id'))
    if (!existingCollection) {
      return c.json({ error: 'Collection not found' }, 404)
    }

    await kv.deleteCollection(c.req.param('id'))
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return c.json({ error: 'Failed to delete collection' }, 500)
  }
})

// Admin update product
app.put('/api/admin/products/:id', async (c) => {
  try {
    const updates = await c.req.json()
    const kv = new KVManager(getKVNamespace(c.env))
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const existingProduct = await kv.getProduct(c.req.param('id'))
    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404)
    }

    // Update Stripe product if necessary
    if (updates.name || updates.description || updates.images || updates.imageUrl) {
      const stripeImages = Array.isArray(updates.images) ? updates.images : 
                          (updates.imageUrl ? [updates.imageUrl] : 
                          (Array.isArray(existingProduct.images) ? existingProduct.images : 
                          (existingProduct.imageUrl ? [existingProduct.imageUrl] : [])))
      
      await stripe.products.update(existingProduct.stripeProductId, {
        name: updates.name || existingProduct.name,
        description: updates.description || existingProduct.description,
        images: stripeImages.slice(0, 8),
      })
    }

    // If price changed, create new price in Stripe
    if (updates.price && updates.price !== existingProduct.price) {
      const newPrice = await stripe.prices.create({
        unit_amount: Math.round(updates.price * 100),
        currency: updates.currency || existingProduct.currency,
        product: existingProduct.stripeProductId,
      })
      
      // Archive old price
      if (existingProduct.stripePriceId) {
        await stripe.prices.update(existingProduct.stripePriceId, {
          active: false,
        })
      }
      
      updates.stripePriceId = newPrice.id
    }

    const updatedProduct = await kv.updateProduct(c.req.param('id'), updates)
    return c.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    return c.json({ error: 'Failed to update product' }, 500)
  }
})

// Admin list products (include archived)
app.get('/api/admin/products', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
    const products = await kv.getAllProducts()
    return c.json(products)
  } catch (error) {
    console.error('Error listing admin products:', error)
    return c.json({ error: 'Failed to list products' }, 500)
  }
})

// Admin delete product
app.delete('/api/admin/products/:id', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const existingProduct = await kv.getProduct(c.req.param('id'))
    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404)
    }

    // Archive Stripe product and price
    if (existingProduct.stripePriceId) {
      await stripe.prices.update(existingProduct.stripePriceId, {
        active: false,
      })
    }
    
    if (existingProduct.stripeProductId) {
      await stripe.products.update(existingProduct.stripeProductId, {
        active: false,
      })
    }

    await kv.deleteProduct(c.req.param('id'))
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return c.json({ error: 'Failed to delete product' }, 500)
  }
})

// Admin update store settings
app.put('/api/admin/store-settings', async (c) => {
  try {
    const settings = await c.req.json()
    const kv = new KVManager(getKVNamespace(c.env))

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
      heroImageUrl: '',
      heroTitle: 'Welcome to OpenShop',
      heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.',
    }

    const updatedSettings = { ...defaultSettings, ...settings }
    await kv.namespace.put('store:settings', JSON.stringify(updatedSettings))

    return c.json(updatedSettings)
  } catch (error) {
    console.error('Error updating store settings:', error)
    return c.json({ error: 'Failed to update store settings' }, 500)
  }
})

// Admin analytics endpoint (requires authentication)
app.get('/api/admin/analytics', async (c) => {
  try {
    const period = c.req.query('period') || '30d'
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)

    const now = new Date()
    const periodDays = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
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

// Admin orders (fulfillment) endpoint with cursor-based pagination
// Query params: limit (default 20), direction ('next'|'prev'), cursor (session id)
app.get('/api/admin/orders', async (c) => {
  try {
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY)
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50)
    const direction = c.req.query('direction') || 'next'
    const cursor = c.req.query('cursor') || undefined

    const listParams = { limit }
    if (cursor) {
      if (direction === 'prev') {
        listParams.ending_before = cursor
      } else {
        listParams.starting_after = cursor
      }
    }

    // List completed sessions (orders)
    const sessions = await stripe.checkout.sessions.list({
      ...listParams
    })

    // Oldest at top within the current page
    const ordered = [...sessions.data].reverse()

    // Fetch line items for each session
    const orders = []
    for (const s of ordered) {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100 })
        orders.push({
          id: s.id,
          created: s.created,
          amount_total: s.amount_total,
          currency: s.currency,
          customer_email: s.customer_details?.email || s.customer_email || null,
          customer_name: s.customer_details?.name || null,
          shipping: s.shipping_details || null,
          items: lineItems.data.map(li => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            amount_total: li.amount_total,
            currency: li.currency
          }))
        })
      } catch (e) {
        console.error('Error fetching line items for session', s.id, e)
        orders.push({
          id: s.id,
          created: s.created,
          amount_total: s.amount_total,
          currency: s.currency,
          customer_email: s.customer_details?.email || s.customer_email || null,
          customer_name: s.customer_details?.name || null,
          shipping: s.shipping_details || null,
          items: []
        })
      }
    }

    // Cursors for next/prev paging
    const nextCursor = sessions.data.length > 0 ? sessions.data[0].id : null // since we reversed
    const prevCursor = sessions.data.length > 0 ? sessions.data[sessions.data.length - 1].id : null

    return c.json({
      limit,
      orders,
      cursors: { next: nextCursor, prev: prevCursor },
      has_more: sessions.has_more
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return c.json({ error: 'Failed to fetch orders' }, 500)
  }
})

// Handle static assets using Workers Assets
app.get('*', async (c) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname
  
  // Skip API routes - they're handled above
  if (pathname.startsWith('/api/')) {
    return c.notFound()
  }
  
  try {
    // Try to serve the requested file first
    if (pathname !== '/' && !pathname.startsWith('/admin') && !pathname.startsWith('/collections') && !pathname.startsWith('/products') && !pathname.startsWith('/success')) {
      const asset = await c.env.ASSETS.fetch(c.req)
      if (asset.ok) {
        return asset
      }
    }
    
    // For SPA routes (/admin, /collections, etc.) or root, serve index.html
    const indexRequest = new Request(c.req.url.replace(pathname, '/index.html'), c.req)
    const indexAsset = await c.env.ASSETS.fetch(indexRequest)
    
    if (indexAsset.ok) {
      return indexAsset
    } else {
      throw new Error('index.html not found')
    }
  } catch (error) {
    console.error('Error serving static asset:', error, 'for path:', pathname)
    
    // Fallback HTML for when assets can't be loaded
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OpenShop - Loading Error</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #9333ea 0%, #2563eb 100%);
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .container { max-width: 500px; }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            .error { font-size: 1.2rem; margin: 20px 0; opacity: 0.9; }
            .help { font-size: 1rem; margin-top: 30px; opacity: 0.8; }
            a { color: white; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>OpenShop</h1>
            <div class="error">Application loading error</div>
            <p>The application assets could not be loaded.</p>
            <div class="help">
              <p>Try:</p>
              <ul style="text-align: left; display: inline-block;">
                <li>Refreshing the page</li>
                <li>Checking your internet connection</li>
                <li>Contacting support if the issue persists</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `, 500)
  }
})

export default app
