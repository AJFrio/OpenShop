// Admin agent routes - AI assistant backed by OpenRouter that can manage
// products, collections, and pages by calling the existing admin endpoints.
import { Hono } from 'hono'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// Reference to the main Hono app, set during route registration so the agent
// can invoke existing admin endpoints in-process (keeps Stripe sync,
// validation, and product limits consistent with the normal admin flows).
let appRef = null

export function setAgentApp(app) {
  appRef = app
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'z-ai/glm-5.3-flash'
const MAX_TOOL_ITERATIONS = 8

const PAGE_COMPONENTS_DOC = `Page builder components (each content item is { "type": string, "props": object }):
- HeroSection: props { title, subtitle, imageUrl, primaryLabel, primaryPath, secondaryLabel, secondaryPath }
- FeaturedProducts: props { heading, maxItems (1-12) }
- ProductGrid: props { heading, showCollectionFilter (boolean) }
- RichTextSection: props { heading, body (HTML string) }
- ImageTextSection: props { imageUrl, heading, body, imageAlign ("left"|"right") }
Root props support { title, description } for SEO.`

function buildSystemPrompt() {
  return [
    'You are the OpenShop store agent. You help merchants run their store by managing products, collections, and storefront pages.',
    'Use the provided tools to read and change store data. Prefer listing entities first to find correct IDs/slugs before updating or deleting.',
    'When asked to "change my site", build or edit pages using the page builder components documented below.',
    'Be concise in your replies. Summarize exactly what you created, changed, or deleted.',
    'Prices are decimal amounts (e.g. 19.99) in the store currency (USD unless told otherwise).',
    '',
    PAGE_COMPONENTS_DOC,
  ].join('\n')
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_products',
      description: 'List all products in the store',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product',
      description: 'Get a single product by ID',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Product ID' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_product',
      description: 'Create a new product. Syncs to Stripe like the regular admin flow.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number', description: 'Decimal price, e.g. 19.99' },
          description: { type: 'string' },
          currency: { type: 'string', description: 'ISO currency code, defaults to USD' },
          imageUrl: { type: 'string', description: 'Main image URL' },
          images: { type: 'array', items: { type: 'string' } },
          collectionId: { type: 'string', description: 'Collection to assign the product to' },
        },
        required: ['name', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_product',
      description: 'Update an existing product. Only provided fields are changed.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          description: { type: 'string' },
          imageUrl: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          collectionId: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_product',
      description: 'Delete a product permanently',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_collections',
      description: 'List all collections in the store',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_collection',
      description: 'Create a new collection (a named group of products)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_collection',
      description: 'Update an existing collection. Only provided fields are changed.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_collection',
      description: 'Delete a collection permanently',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pages',
      description: 'List all storefront page-builder pages with their slugs',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_page',
      description: 'Create a new empty page-builder page. Slug must be lowercase letters, numbers, and dashes (e.g. "summer-sale").',
      parameters: {
        type: 'object',
        properties: { slug: { type: 'string' } },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_page',
      description: 'Create (if missing) or update a page-builder page. Provide SEO title/description and/or a content array of components.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          seoTitle: { type: 'string' },
          seoDescription: { type: 'string' },
          content: {
            type: 'array',
            description: 'Ordered list of page sections. Omit to keep existing content.',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['HeroSection', 'FeaturedProducts', 'ProductGrid', 'RichTextSection', 'ImageTextSection'] },
                props: { type: 'object' },
              },
              required: ['type', 'props'],
            },
          },
        },
        required: ['slug'],
      },
    },
  },
]

/**
 * Invoke an internal endpoint on the main app, forwarding the caller's admin
 * token so global auth middleware still applies.
 */
async function dispatch(c, path, init = {}) {
  if (!appRef) {
    throw new Error('Agent app reference not initialized')
  }

  const headers = new Headers(init.headers || {})
  headers.set('X-Admin-Token', c.req.header('X-Admin-Token') || '')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await appRef.request(path, { ...init, headers }, c.env, c.executionCtx)
  const text = await res.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {}

  return { status: res.status, ok: res.ok, body }
}

function summarizeResult(action, result) {
  const b = result.body
  if (!result.ok) {
    const detail = b?.error || `HTTP ${result.status}`
    return `Failed: ${detail}`
  }
  switch (action.tool) {
    case 'create_product':
      return `Created product "${b?.name}" (${b?.id})`
    case 'update_product':
      return `Updated product "${b?.name}" (${b?.id})`
    case 'delete_product':
      return `Deleted product ${action.args.id}`
    case 'create_collection':
      return `Created collection "${b?.name}" (${b?.id})`
    case 'update_collection':
      return `Updated collection "${b?.name}" (${b?.id})`
    case 'delete_collection':
      return `Deleted collection ${action.args.id}`
    case 'create_page':
      return `Created page "${action.args.slug}"`
    case 'update_page':
      return `Updated page "${action.args.slug}"`
    default:
      return `${action.tool} ok`
  }
}

function trimProduct(p) {
  if (!p || typeof p !== 'object') return p
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
    description: p.description,
    imageUrl: p.imageUrl,
    images: Array.isArray(p.images) ? p.images.slice(0, 5) : undefined,
    collectionId: p.collectionId,
    variantCount: Array.isArray(p.variants) ? p.variants.length : 0,
    archived: !!p.archived,
  }
}

async function executeTool(c, name, args) {
  const a = args || {}
  switch (name) {
    case 'list_products': {
      const r = await dispatch(c, '/api/admin/products')
      return { status: r.status, data: Array.isArray(r.body) ? r.body.map(trimProduct) : r.body }
    }
    case 'get_product': {
      const r = await dispatch(c, `/api/admin/products/${encodeURIComponent(a.id)}`)
      return { status: r.status, data: trimProduct(r.body) }
    }
    case 'create_product': {
      const payload = {
        name: a.name,
        price: Number(a.price),
        description: a.description ?? '',
        currency: a.currency ?? 'USD',
      }
      if (a.imageUrl) payload.imageUrl = a.imageUrl
      if (Array.isArray(a.images)) payload.images = a.images.filter(Boolean)
      else if (a.imageUrl) payload.images = [a.imageUrl]
      if (a.collectionId) payload.collectionId = a.collectionId
      const r = await dispatch(c, '/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
      return { status: r.status, data: trimProduct(r.body) }
    }
    case 'update_product': {
      const payload = {}
      if (a.name !== undefined) payload.name = a.name
      if (a.price !== undefined) payload.price = Number(a.price)
      if (a.description !== undefined) payload.description = a.description
      if (a.imageUrl !== undefined) payload.imageUrl = a.imageUrl
      if (Array.isArray(a.images)) payload.images = a.images.filter(Boolean)
      if (a.collectionId !== undefined) payload.collectionId = a.collectionId
      const r = await dispatch(c, `/api/admin/products/${encodeURIComponent(a.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return { status: r.status, data: trimProduct(r.body) }
    }
    case 'delete_product': {
      const r = await dispatch(c, `/api/admin/products/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      return { status: r.status, data: r.body ?? null }
    }
    case 'list_collections': {
      const r = await dispatch(c, '/api/admin/collections')
      return { status: r.status, data: r.body }
    }
    case 'create_collection': {
      const r = await dispatch(c, '/api/admin/collections', {
        method: 'POST',
        body: JSON.stringify({ name: a.name, description: a.description ?? '' }),
      })
      return { status: r.status, data: r.body }
    }
    case 'update_collection': {
      const payload = {}
      if (a.name !== undefined) payload.name = a.name
      if (a.description !== undefined) payload.description = a.description
      const r = await dispatch(c, `/api/admin/collections/${encodeURIComponent(a.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return { status: r.status, data: r.body }
    }
    case 'delete_collection': {
      const r = await dispatch(c, `/api/admin/collections/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      return { status: r.status, data: r.body ?? null }
    }
    case 'list_pages': {
      const r = await dispatch(c, '/api/admin/storefront/pages')
      return { status: r.status, data: r.body }
    }
    case 'create_page':
    case 'update_page':
    case 'get_page': {
      throw new Error(`Tool ${name} handled elsewhere`)
    }
    default:
      return { status: 400, data: { error: `Unknown tool: ${name}` } }
  }
}

// Pages need read-modify-write logic, so they are implemented separately.
async function executePageTool(c, name, args) {
  const a = args || {}
  const slug = String(a.slug || '').trim()

  if (name === 'get_page') {
    const r = await dispatch(c, `/api/admin/storefront/pages/${encodeURIComponent(slug)}`)
    if (!r.ok) return { status: r.status, data: r.body }
    const content = Array.isArray(r.body?.data?.content) ? r.body.data.content : []
    return {
      status: r.status,
      data: {
        slug: r.body.slug,
        updatedAt: r.body.updatedAt,
        rootProps: r.body?.data?.root?.props ?? {},
        content,
      },
    }
  }

  if (name === 'create_page') {
    const r = await dispatch(c, '/api/admin/storefront/pages', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    })
    // Treat "already exists" as success so update_page can upsert.
    if (!r.ok && !String(r.body?.error || '').includes('already exists')) {
      return { status: r.status, data: r.body }
    }
    return { status: 200, data: { slug, created: true } }
  }

  // update_page: merge requested changes onto the existing page (upsert).
  const existing = await dispatch(c, `/api/admin/storefront/pages/${encodeURIComponent(slug)}`)
  let currentData = existing.ok ? existing.body?.data : null
  if (!currentData) {
    const created = await dispatch(c, '/api/admin/storefront/pages', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    })
    if (!created.ok) return { status: created.status, data: created.body }
    currentData = created.body?.data ?? { content: [], root: { props: {} } }
  }

  const nextData = {
    content: Array.isArray(a.content) ? a.content : currentData.content ?? [],
    root: {
      props: {
        ...(currentData.root?.props ?? {}),
        ...(a.seoTitle !== undefined ? { title: a.seoTitle } : {}),
        ...(a.seoDescription !== undefined ? { description: a.seoDescription } : {}),
      },
    },
  }

  const r = await dispatch(c, `/api/admin/storefront/pages/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(nextData),
  })
  return { status: r.status, data: r.ok ? { slug, updated: true } : r.body }
}

async function callOpenRouter(apiKey, model, messages) {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOL_DEFINITIONS,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('OpenRouter API error', res.status, errText)
    throw new Error(`OpenRouter API failed (${res.status}): ${errText.slice(0, 500)}`)
  }

  return await res.json()
}

// GET /api/admin/agent/models - list available OpenRouter models
router.get('/models', asyncHandler(async (c) => {
  const apiKey = c.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return c.json({ models: [], defaultModel: DEFAULT_MODEL, configured: false })
  }

  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    console.error('OpenRouter models error', res.status)
    return c.json({ models: [], defaultModel: DEFAULT_MODEL, configured: true })
  }

  const data = await res.json()
  const models = (data?.data || [])
    .map((m) => ({ id: m.id, name: m.name || m.id }))
    .sort((x, y) => x.id.localeCompare(y.id))

  return c.json({
    models,
    defaultModel: c.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    configured: true,
  })
}))

// POST /api/admin/agent/chat - send a conversation, get the agent's reply
router.post('/chat', asyncHandler(async (c) => {
  const apiKey = c.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new ValidationError('OPENROUTER_API_KEY not configured. Add it with "wrangler secret put OPENROUTER_API_KEY".')
  }

  const { messages, model } = await c.req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('messages must be a non-empty array')
  }

  const history = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content }))

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    throw new ValidationError('Last message must be from the user')
  }

  const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : (c.env.OPENROUTER_MODEL || DEFAULT_MODEL)

  const chatMessages = [{ role: 'system', content: buildSystemPrompt() }, ...history]
  const actions = []

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await callOpenRouter(apiKey, selectedModel, chatMessages)
    const choice = completion?.choices?.[0]?.message

    if (!choice) {
      throw new Error('OpenRouter returned no message')
    }

    chatMessages.push(choice)

    const toolCalls = Array.isArray(choice.tool_calls) ? choice.tool_calls : []
    if (toolCalls.length === 0) {
      return c.json({ message: choice.content || '', model: selectedModel, actions })
    }

    for (const call of toolCalls) {
      const name = call?.function?.name
      let args = {}
      try {
        args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {}

      const action = { tool: name, args }
      try {
        const result = name === 'get_page' || name === 'create_page' || name === 'update_page'
          ? await executePageTool(c, name, args)
          : await executeTool(c, name, args)

        action.ok = result.status < 400
        action.summary = summarizeResult(action, { ...result, ok: action.ok })
        chatMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result.data ?? { status: result.status }).slice(0, 24000),
        })
      } catch (err) {
        action.ok = false
        action.summary = `Failed: ${err.message}`
        chatMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: err.message }),
        })
      }
      actions.push(action)
    }
  }

  // Tool loop budget exhausted - ask for a direct answer without tools.
  const completion = await callOpenRouter(apiKey, selectedModel, [
    ...chatMessages,
    { role: 'user', content: 'Stop using tools and give your final answer now.' },
  ])
  const finalMessage = completion?.choices?.[0]?.message?.content || ''
  return c.json({ message: finalMessage, model: selectedModel, actions })
}))

export default router
