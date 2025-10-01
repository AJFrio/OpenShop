// Main Cloudflare Worker with Hono framework
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { KVManager } from './lib/kv.js'
import { verifyAdminAuth, hashToken } from './middleware/auth.js'
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

function getCrypto() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null
  if (!cryptoObj) {
    throw new Error('Web Crypto API is not available in this environment')
  }
  return cryptoObj
}

function randomHex(bytes = 16) {
  const cryptoObj = getCrypto()
  if (typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available')
  }
  const buffer = new Uint8Array(bytes)
  cryptoObj.getRandomValues(buffer)
  return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('')
}

function generateSessionToken() {
  const cryptoObj = getCrypto()
  if (typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID().replace(/-/g, '')
  }
  return randomHex(32)
}

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

// Image proxy for Google Drive links to avoid browser-side 403/CORS
app.get('/api/image-proxy', async (c) => {
  try {
    const src = c.req.query('src')
    if (!src) return c.json({ error: 'Missing src' }, 400)

    let targetUrl
    try {
      const u = new URL(src)
      const allowedHosts = [
        'drive.google.com',
        'drive.usercontent.google.com',
        'lh3.googleusercontent.com',
      ]
      const isAllowed = allowedHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h))
      if (!isAllowed) return c.json({ error: 'Host not allowed' }, 400)

      // Normalize Google Drive links to direct download CDN form
      if (u.hostname.endsWith('drive.google.com')) {
        // Extract id from /file/d/<id>/... or ?id=
        const pathId = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
        const queryId = u.searchParams.get('id')
        const id = (pathId && pathId[1]) || queryId
        if (!id) return c.json({ error: 'Missing Google Drive file id' }, 400)
        targetUrl = `https://drive.usercontent.google.com/download?id=${id}&export=view`
      } else if (u.hostname.endsWith('drive.usercontent.google.com')) {
        const id = u.searchParams.get('id')
        if (!id) return c.json({ error: 'Missing Google Drive file id' }, 400)
        const newUrl = new URL('https://drive.usercontent.google.com/download')
        newUrl.searchParams.set('id', id)
        newUrl.searchParams.set('export', 'view')
        targetUrl = newUrl.toString()
      } else {
        // Other googleusercontent hosts (e.g., thumbnails) pass-through
        targetUrl = u.toString()
      }
    } catch (_) {
      return c.json({ error: 'Invalid src url' }, 400)
    }

    const upstream = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        // Emulate a standard browser fetch
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://drive.google.com/',
      },
      cf: { cacheEverything: true },
    })

    if (!upstream.ok) {
      return c.json({ error: 'Upstream error', status: upstream.status }, upstream.status)
    }

    const headers = new Headers()
    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=86400')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

    return new Response(upstream.body, { headers })
  } catch (e) {
    console.error('Image proxy error', e)
    return c.json({ error: 'Proxy failed' }, 500)
  }
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
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      billing_address_collection: 'required',
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
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      billing_address_collection: 'required',
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
  // Skip auth for login and Drive OAuth endpoints (popup has no headers)
  const unauthenticatedPaths = new Set([
    '/api/admin/login',
    '/api/admin/drive/oauth/start',
    '/api/admin/drive/oauth/callback'
  ])
  if (unauthenticatedPaths.has(c.req.path)) {
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

// =====================================
// ADMIN: AI Image Generation (Gemini REST)
// =====================================

app.post('/api/admin/ai/generate-image', async (c) => {
  try {
    const { prompt, inputs } = await c.req.json()
    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Missing prompt' }, 400)
    }
    const parts = []
    parts.push({ text: prompt })
    if (Array.isArray(inputs)) {
      for (const item of inputs.slice(0, 4)) {
        if (item && item.dataBase64 && item.mimeType) {
          parts.push({
            inline_data: {
              mime_type: item.mimeType,
              data: item.dataBase64
            }
          })
        }
      }
    }

    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey) {
      return c.json({ error: 'GEMINI_API_KEY not configured' }, 500)
    }

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [ { parts } ]
      })
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error', res.status, errText)
      return c.json({ error: 'Gemini API failed', details: errText }, res.status)
    }
    const data = await res.json()
    const candidates = data?.candidates || []
    let foundBase64 = null
    let mime = 'image/png'
    for (const cand of candidates) {
      const parts = cand?.content?.parts || []
      for (const p of parts) {
        const inlineA = p?.inlineData || p?.inline_data
        if (inlineA && inlineA.data) {
          foundBase64 = inlineA.data
          mime = inlineA.mimeType || inlineA.mime_type || mime
          break
        }
      }
      if (foundBase64) break
    }
    if (!foundBase64) {
      return c.json({ error: 'No image returned from Gemini' }, 502)
    }
    return c.json({ mimeType: mime, dataBase64: foundBase64 })
  } catch (e) {
    console.error('AI generation error', e)
    return c.json({ error: 'Generation failed' }, 500)
  }
})

// =====================================
// ADMIN: Google Drive OAuth + Upload
// =====================================

const DRIVE_TOKEN_KEY = 'drive:oauth:tokens'
const DRIVE_FOLDER_KV_PREFIX = 'drive:folder'

app.get('/api/admin/drive/status', async (c) => {
  try {
    const kv = getKVNamespace(c.env)
    const raw = await kv.get(DRIVE_TOKEN_KEY)
    if (!raw) return c.json({ connected: false })
    const t = JSON.parse(raw)
    return c.json({ connected: !!t?.access_token })
  } catch (_) {
    return c.json({ connected: false })
  }
})

app.get('/api/admin/drive/oauth/start', async (c) => {
  try {
    const clientId = c.env.GOOGLE_CLIENT_ID
    const origin = new URL(c.req.url).origin
    const redirectUri = `${origin}/api/admin/drive/oauth/callback`
    if (!clientId || !redirectUri) {
      return c.json({ error: 'Drive OAuth not configured' }, 500)
    }
    const params = new URLSearchParams()
    params.set('response_type', 'code')
    params.set('client_id', clientId)
    params.set('redirect_uri', redirectUri)
    params.set('scope', 'https://www.googleapis.com/auth/drive.file')
    params.set('access_type', 'offline')
    params.set('prompt', 'consent')
    params.set('include_granted_scopes', 'true')
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return c.redirect(url, 302)
  } catch (e) {
    console.error('Drive oauth start error', e)
    return c.json({ error: 'OAuth start failed' }, 500)
  }
})

app.get('/api/admin/drive/oauth/callback', async (c) => {
  try {
    const code = c.req.query('code')
    if (!code) return c.text('Missing code', 400)
    const clientId = c.env.GOOGLE_CLIENT_ID
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET
    const origin = new URL(c.req.url).origin
    const redirectUri = `${origin}/api/admin/drive/oauth/callback`
    if (!clientId || !clientSecret) {
      return c.text('OAuth not configured', 500)
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })
    if (!tokenRes.ok) {
      const t = await tokenRes.text()
      console.error('Token exchange failed', t)
      return c.text('Token exchange failed', 500)
    }
    const tokens = await tokenRes.json()
    const now = Math.floor(Date.now() / 1000)
    const record = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry: now + (tokens.expires_in || 3600) - 30
    }
    await getKVNamespace(c.env).put(DRIVE_TOKEN_KEY, JSON.stringify(record))
    return c.html(`<!doctype html><html><body><p>Google Drive connected. You can close this window.</p><script>setTimeout(()=>window.close(),500)</script></body></html>`)
  } catch (e) {
    console.error('Drive oauth callback error', e)
    return c.text('OAuth callback failed', 500)
  }
})

async function ensureDriveAccessToken(env) {
  const kv = getKVNamespace(env)
  const raw = await kv.get(DRIVE_TOKEN_KEY)
  if (!raw) throw new Error('Drive not connected')
  let tok = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  if (tok.expiry && tok.expiry > now + 60) return tok
  if (!tok.refresh_token) return tok
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: tok.refresh_token,
      grant_type: 'refresh_token'
    })
  })
  if (!tokenRes.ok) {
    // Try to capture error body for diagnostics
    let errText = ''
    try { errText = await tokenRes.text() } catch (_) {}
    console.error('Drive token refresh failed', tokenRes.status, errText)
    // If the refresh token is invalid, clear it so UI can re-connect
    if (errText && /invalid_grant/i.test(errText)) {
      try {
        const cleared = { ...tok, access_token: '', refresh_token: null, expiry: 0 }
        await kv.put(DRIVE_TOKEN_KEY, JSON.stringify(cleared))
      } catch (_) {}
    }
    throw new Error('Failed to refresh token')
  }
  const t = await tokenRes.json()
  tok.access_token = t.access_token
  tok.expiry = Math.floor(Date.now() / 1000) + (t.expires_in || 3600) - 30
  await kv.put(DRIVE_TOKEN_KEY, JSON.stringify(tok))
  return tok
}

async function ensureDriveRootFolder(env, tok) {
  const kv = getKVNamespace(env)
  const desiredName = (env.DRIVE_ROOT_FOLDER && String(env.DRIVE_ROOT_FOLDER).trim()) || deriveDefaultFolderName(env)
  const kvKey = `${DRIVE_FOLDER_KV_PREFIX}:${desiredName}:id`
  const existing = await kv.get(kvKey)
  if (existing) return { id: existing, name: desiredName }

  // Look up folder by name at My Drive root
  const query = `mimeType='application/vnd.google-apps.folder' and name='${desiredName.replace(/'/g, "\\'")}' and 'root' in parents and trashed=false`
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
  const foundRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${tok.access_token}` }
  })
  if (foundRes.ok) {
    const j = await foundRes.json()
    if (Array.isArray(j.files) && j.files.length > 0) {
      const id = j.files[0].id
      await kv.put(kvKey, id)
      return { id, name: desiredName }
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: desiredName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  })
  if (!createRes.ok) {
    const t = await createRes.text()
    console.error('Failed to create Drive folder', t)
    throw new Error('Failed to create Drive folder')
  }
  const created = await createRes.json()
  const folderId = created.id
  await kv.put(kvKey, folderId)
  return { id: folderId, name: desiredName }
}

function deriveDefaultFolderName(env) {
  try {
    if (env.SITE_URL) {
      const u = new URL(env.SITE_URL)
      const sub = u.hostname.split('.')[0] || 'openshop'
      return sub.replace(/[-_]+/g, ' ').trim()
    }
  } catch (_) {}
  return 'OpenShop'
}

app.post('/api/admin/drive/upload', async (c) => {
  try {
    const { mimeType, dataBase64, filename } = await c.req.json()
    if (!mimeType || !dataBase64) {
      return c.json({ error: 'Missing mimeType or dataBase64' }, 400)
    }
    // Ensure we have a valid access token; surface clear errors if not
    let tok
    try {
      tok = await ensureDriveAccessToken(c.env)
    } catch (e) {
      const msg = String(e && e.message ? e.message : e)
      // If token refresh failed or Drive not connected, instruct client to reconnect
      if (/Drive not connected/i.test(msg)) {
        return c.json({ error: 'Drive not connected. Please connect Google Drive in Admin.' }, 401)
      }
      if (/Failed to refresh token/i.test(msg)) {
        return c.json({ error: 'Drive session expired. Please reconnect Google Drive.' }, 401)
      }
      console.error('Drive token ensure error', e)
      return c.json({ error: 'Drive authentication failed' }, 502)
    }
    const folder = await ensureDriveRootFolder(c.env, tok)
    const boundary = `openshop-${generateSessionToken()}`
    const metadata = { name: filename || 'openshop-image', parents: [folder.id] }
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${dataBase64}\r\n` +
      `--${boundary}--`

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tok.access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    })
    if (!uploadRes.ok) {
      const t = await uploadRes.text()
      console.error('Drive upload failed', t)
      return c.json({ error: 'Drive upload failed', details: t }, 502)
    }
    const file = await uploadRes.json()
    const fileId = file.id

    // Make public readable
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tok.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    }).catch(() => {})

    const viewUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=view`
    return c.json({ id: fileId, viewUrl, webViewLink: file.webViewLink, downloadUrl: viewUrl, folder: { id: folder.id, name: folder.name } })
  } catch (e) {
    console.error('Drive upload error', e)
    return c.json({ error: 'Upload failed' }, 500)
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

    const token = generateSessionToken()
    const hashedToken = await hashToken(token)

    await getKVNamespace(c.env).put(`admin_token:${hashedToken}`, Date.now().toString(), {
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
    
    const productParams = {
      name: productData.name,
      images: stripeImages.slice(0, 8),
    }
    if (productData.description && String(productData.description).trim() !== '') {
      productParams.description = String(productData.description)
    }
    const stripeProduct = await stripe.products.create(productParams)

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(productData.price * 100),
      currency: productData.currency,
      product: stripeProduct.id,
      nickname: `${productData.name} - Base`,
      metadata: {
        price_type: 'base'
      }
    })

    // Handle variant custom prices
    const variants = Array.isArray(productData.variants) ? productData.variants : []
    const enrichedVariants = []
    for (const v of variants) {
      const hasCustomPrice = !!v.hasCustomPrice && typeof v.price === 'number' && v.price > 0
      if (hasCustomPrice) {
        const variantPrice = await stripe.prices.create({
          unit_amount: Math.round(v.price * 100),
          currency: productData.currency,
          product: stripeProduct.id,
          nickname: `${productData.name}${productData.variantStyle ? ` - ${productData.variantStyle}: ${v.name}` : ` - ${v.name}`}`,
          metadata: {
            price_type: 'variant_primary',
            variant_id: v.id || '',
            variant_name: v.name || '',
            variant1_name: v.name || ''
          }
        })
        enrichedVariants.push({ ...v, stripePriceId: variantPrice.id })
      } else {
        // Fallback to base price
        enrichedVariants.push({ ...v, stripePriceId: stripePrice.id, hasCustomPrice: false })
      }
    }

    // Secondary variants (optional)
    const variants2 = Array.isArray(productData.variants2) ? productData.variants2 : []
    const enrichedVariants2 = []
    for (const v of variants2) {
      const hasCustomPrice = !!v.hasCustomPrice && typeof v.price === 'number' && v.price > 0
      if (hasCustomPrice) {
        const variantPrice = await stripe.prices.create({
          unit_amount: Math.round(v.price * 100),
          currency: productData.currency,
          product: stripeProduct.id,
          nickname: `${productData.name}${productData.variantStyle2 ? ` - ${productData.variantStyle2}: ${v.name}` : ` - ${v.name}`}`,
          metadata: {
            price_type: 'variant_secondary',
            variant_id: v.id || '',
            variant_name: v.name || '',
            variant2_name: v.name || ''
          }
        })
        enrichedVariants2.push({ ...v, stripePriceId: variantPrice.id })
      } else {
        enrichedVariants2.push({ ...v, stripePriceId: stripePrice.id, hasCustomPrice: false })
      }
    }

    const product = {
      ...productData,
      stripePriceId: stripePrice.id,
      stripeProductId: stripeProduct.id,
      variants: enrichedVariants,
      variants2: enrichedVariants2
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
    if (updates.name || updates.description !== undefined || updates.images || updates.imageUrl) {
      const stripeImages = Array.isArray(updates.images) ? updates.images : 
                          (updates.imageUrl ? [updates.imageUrl] : 
                          (Array.isArray(existingProduct.images) ? existingProduct.images : 
                          (existingProduct.imageUrl ? [existingProduct.imageUrl] : [])))

      const updateParams = {
        name: updates.name || existingProduct.name,
        images: stripeImages.slice(0, 8),
      }
      if (typeof updates.description === 'string') {
        const trimmed = updates.description.trim()
        if (trimmed) {
          updateParams.description = trimmed
        }
        // If trimmed is empty, omit 'description' to avoid unsetting (Stripe error)
      }

      await stripe.products.update(existingProduct.stripeProductId, updateParams)
    }

    // If price changed, create new price in Stripe
    if (typeof updates.price !== 'undefined' && updates.price !== existingProduct.price) {
      const numericPrice = typeof updates.price === 'number' ? updates.price : parseFloat(String(updates.price))
      const newPrice = await stripe.prices.create({
        unit_amount: Math.round(numericPrice * 100),
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
      updates.price = numericPrice
    }

    // Handle variant updates and custom prices (primary group)
    if (Array.isArray(updates.variants)) {
      const incomingVariants = updates.variants
      const existingVariants = Array.isArray(existingProduct.variants) ? existingProduct.variants : []
      const baseStripePriceId = updates.stripePriceId || existingProduct.stripePriceId

      const updatedVariants = []
      for (const v of incomingVariants) {
        const prior = v.id ? existingVariants.find(ev => ev.id === v.id) : undefined
        const wantsCustom = !!v.hasCustomPrice && typeof v.price === 'number' && v.price > 0

        if (wantsCustom) {
          const desiredUnitAmount = Math.round(v.price * 100)
          let priceIdToUse = prior?.stripePriceId

          const priorWasCustom = !!prior?.hasCustomPrice && typeof prior?.price === 'number'
          const priorAmount = priorWasCustom ? Math.round(prior.price * 100) : null

          if (!priceIdToUse || !priorWasCustom || priorAmount !== desiredUnitAmount) {
            // Create a new price for this variant
            const newVariantPrice = await stripe.prices.create({
              unit_amount: desiredUnitAmount,
              currency: updates.currency || existingProduct.currency,
              product: existingProduct.stripeProductId,
            })
            // Archive old variant price if it existed and was custom
            if (prior?.stripePriceId && priorWasCustom) {
              try { await stripe.prices.update(prior.stripePriceId, { active: false }) } catch (_) {}
            }
            priceIdToUse = newVariantPrice.id
          }

          updatedVariants.push({ ...v, stripePriceId: priceIdToUse, hasCustomPrice: true })
        } else {
          // No custom price → point to base product price
          // If prior had a custom price, archive that old variant price
          if (prior?.stripePriceId && prior?.hasCustomPrice) {
            try { await stripe.prices.update(prior.stripePriceId, { active: false }) } catch (_) {}
          }
          updatedVariants.push({ ...v, stripePriceId: baseStripePriceId, hasCustomPrice: false, price: undefined })
        }
      }

      updates.variants = updatedVariants
    }

    // Handle secondary variant group
    if (Array.isArray(updates.variants2)) {
      const incomingVariants = updates.variants2
      const existingVariants = Array.isArray(existingProduct.variants2) ? existingProduct.variants2 : []
      const baseStripePriceId = updates.stripePriceId || existingProduct.stripePriceId

      const updatedVariants = []
      for (const v of incomingVariants) {
        const prior = v.id ? existingVariants.find(ev => ev.id === v.id) : undefined
        const wantsCustom = !!v.hasCustomPrice && typeof v.price === 'number' && v.price > 0

        if (wantsCustom) {
          const desiredUnitAmount = Math.round(v.price * 100)
          let priceIdToUse = prior?.stripePriceId

          const priorWasCustom = !!prior?.hasCustomPrice && typeof prior?.price === 'number'
          const priorAmount = priorWasCustom ? Math.round(prior.price * 100) : null

          if (!priceIdToUse || !priorWasCustom || priorAmount !== desiredUnitAmount) {
            const newVariantPrice = await stripe.prices.create({
              unit_amount: desiredUnitAmount,
              currency: updates.currency || existingProduct.currency,
              product: existingProduct.stripeProductId,
              nickname: `${updates.name || existingProduct.name}${(updates.variantStyle2 || existingProduct.variantStyle2) ? ` - ${(updates.variantStyle2 || existingProduct.variantStyle2)}: ${v.name}` : ` - ${v.name}`}`,
              metadata: {
                price_type: 'variant_secondary',
                variant_id: v.id || '',
                variant_name: v.name || '',
                variant2_name: v.name || ''
              }
            })
            if (prior?.stripePriceId && priorWasCustom) {
              try { await stripe.prices.update(prior.stripePriceId, { active: false }) } catch (_) {}
            }
            priceIdToUse = newVariantPrice.id
          }

          updatedVariants.push({ ...v, stripePriceId: priceIdToUse, hasCustomPrice: true })
        } else {
          if (prior?.stripePriceId && prior?.hasCustomPrice) {
            try { await stripe.prices.update(prior.stripePriceId, { active: false }) } catch (_) {}
          }
          updatedVariants.push({ ...v, stripePriceId: baseStripePriceId, hasCustomPrice: false, price: undefined })
        }
      }

      updates.variants2 = updatedVariants
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

    if (period === '1d') {
      // Hourly breakdown for last 24 hours
      const hourlyOrders = {}
      const hourlyRevenue = {}

      successfulPayments.forEach(payment => {
        const d = new Date(payment.created * 1000)
        const bucket = new Date(d)
        bucket.setMinutes(0, 0, 0)
        const key = bucket.toISOString()
        hourlyOrders[key] = (hourlyOrders[key] || 0) + 1
        hourlyRevenue[key] = (hourlyRevenue[key] || 0) + (payment.amount / 100)
      })

      const cursor = new Date(now)
      cursor.setMinutes(0, 0, 0)
      // iterate oldest to newest across 24 hours
      const startHour = new Date(cursor.getTime() - 23 * 60 * 60 * 1000)
      const iter = new Date(startHour)
      while (iter <= cursor) {
        const key = new Date(iter).toISOString()
        chartData.push({
          date: key,
          orders: hourlyOrders[key] || 0,
          revenue: Math.round(((hourlyRevenue[key] || 0) + Number.EPSILON) * 100) / 100,
          formattedDate: new Date(iter).toLocaleTimeString('en-US', { hour: 'numeric' })
        })
        iter.setHours(iter.getHours() + 1)
      }
    } else {
      // Daily breakdown for longer periods
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
    }

    return c.json({
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      chartData,
      recentOrders: [], // Simplified for this implementation
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
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

    // List sessions and filter to paid/completed only
    const sessions = await stripe.checkout.sessions.list({
      ...listParams
    })

    // Oldest at top within the current page
    const ordered = [...sessions.data]
      .filter(s => s.payment_status === 'paid' || s.status === 'complete' || s.status === 'completed')
      .reverse()

    // Fetch line items for each session
    const orders = []
    for (const s of ordered) {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100, expand: ['data.price'] })
        orders.push({
          id: s.id,
          created: s.created,
          amount_total: s.amount_total,
          currency: s.currency,
          customer_email: s.customer_details?.email || s.customer_email || null,
          customer_name: s.customer_details?.name || null,
          shipping: s.shipping_details || null,
          billing: {
            name: s.customer_details?.name || null,
            email: s.customer_details?.email || null,
            address: s.customer_details?.address || null
          },
          items: lineItems.data.map(li => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            amount_total: li.amount_total,
            currency: li.currency,
            price_nickname: li.price?.nickname || li.price?.metadata?.variant_name || null,
            variant1_name: li.price?.metadata?.variant1_name || li.price?.metadata?.variant_name || null,
            variant2_name: li.price?.metadata?.variant2_name || null
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
          billing: {
            name: s.customer_details?.name || null,
            email: s.customer_details?.email || null,
            address: s.customer_details?.address || null
          },
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

// =====================================
// ADMIN: Media Library Endpoints
// =====================================

function generateServerId() {
  const rnd = randomHex(4)
  const ts = Date.now().toString(36)
  return `${ts}-${rnd}`
}

// List media items (most recent first)
app.get('/api/admin/media', async (c) => {
  try {
    const kv = new KVManager(getKVNamespace(c.env))
    const items = await kv.getAllMediaItems()
    const sorted = [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    return c.json(sorted)
  } catch (error) {
    console.error('Error listing media:', error)
    return c.json({ error: 'Failed to list media' }, 500)
  }
})

// Create media item (record a URL as available media)
app.post('/api/admin/media', async (c) => {
  try {
    const body = await c.req.json()
    const url = body?.url
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return c.json({ error: 'url is required' }, 400)
    }
    const kv = new KVManager(getKVNamespace(c.env))
    const item = {
      id: body.id || generateServerId(),
      url: String(url),
      source: body.source || 'link',
      filename: body.filename || '',
      mimeType: body.mimeType || '',
      driveFileId: body.driveFileId || '',
      createdAt: typeof body.createdAt === 'number' ? body.createdAt : Date.now(),
    }
    const saved = await kv.createMediaItem(item)
    return c.json(saved, 201)
  } catch (error) {
    console.error('Error creating media:', error)
    return c.json({ error: 'Failed to create media' }, 500)
  }
})

// Delete media item (removes from library; does not delete from Google Drive)
app.delete('/api/admin/media/:id', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'Missing id' }, 400)
    const kv = new KVManager(getKVNamespace(c.env))
    await kv.deleteMediaItem(id)
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting media:', error)
    return c.json({ error: 'Failed to delete media' }, 500)
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
