// Store agent tool definitions and in-process dispatch against admin APIs.
// Tools persist through the same endpoints a merchant uses, so validation,
// Stripe sync, and product limits stay consistent with the admin UI.

import { DEVELOPER_SETTING_FIELDS } from '../../services/DeveloperSettingsService.js'
import { FONT_OPTIONS } from '../../lib/theme.js'

export const MAX_TOOL_ITERATIONS = 12

const FONT_IDS = FONT_OPTIONS.map((font) => font.id)

const PAGE_COMPONENTS_DOC = `Page builder components (each content item is { "type": string, "props": object }):
- HeroSection: props { title, subtitle, imageUrl, primaryLabel, primaryPath, secondaryLabel, secondaryPath }
- FeaturedProducts: props { heading, maxItems (1-12) }
- ProductGrid: props { heading, showCollectionFilter (boolean) }
- RichTextSection: props { heading, body (HTML string) }
- ImageTextSection: props { imageUrl, heading, body, imageAlign ("left"|"right") }
Root props support { title, description } for SEO.`

const VARIANT_ITEM = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Variant label, e.g. "Small" or "Heather Grey"' },
    hasCustomPrice: { type: 'boolean' },
    price: { type: 'number', description: 'Decimal price when hasCustomPrice is true' },
    selectorImageUrl: { type: 'string' },
    displayImageUrl: { type: 'string' },
  },
}

function fn(name, description, properties = {}, required = []) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: { type: 'object', properties, required },
    },
  }
}

export const TOOL_DEFINITIONS = [
  fn('list_products', 'List all products in the store (including archived)'),
  fn('get_product', 'Get a single product by ID, including variants', {
    id: { type: 'string', description: 'Product ID' },
  }, ['id']),
  fn('create_product', 'Create a new product. Syncs to Stripe like the regular admin flow.', {
    name: { type: 'string' },
    price: { type: 'number', description: 'Decimal price, e.g. 19.99' },
    description: { type: 'string' },
    tagline: { type: 'string' },
    currency: { type: 'string', description: 'ISO currency code, defaults to USD' },
    imageUrl: { type: 'string', description: 'Main image URL' },
    images: { type: 'array', items: { type: 'string' } },
    collectionId: { type: 'string', description: 'Collection to assign the product to' },
    archived: { type: 'boolean', description: 'Hide from the storefront' },
    variantStyle: { type: 'string', description: 'Label for the first variant group, e.g. Size' },
    variants: { type: 'array', items: VARIANT_ITEM },
    variantStyle2: { type: 'string', description: 'Label for the second variant group, e.g. Color' },
    variants2: { type: 'array', items: VARIANT_ITEM },
  }, ['name', 'price']),
  fn(
    'generate_product_image',
    'Generate a product or merchandise mockup image and store it in the media library. Returns a URL to pass as imageUrl when creating a product. Reference images the user attached are used automatically; describe who should wear it, the pose, the garment and the artwork in the matching fields rather than cramming everything into one description.',
    {
      description: { type: 'string', description: 'Overall description of the desired image' },
      model: { type: 'string', description: 'Who is wearing the item, e.g. "a young woman with short dark hair"' },
      pose: { type: 'string', description: 'How they are posed. Leave blank to keep the pose from the reference image.' },
      product: { type: 'string', description: 'The garment or product, e.g. "a heather grey hoodie"' },
      logo: { type: 'string', description: 'What is printed on the item' },
    },
  ),
  fn(
    'generate_image',
    'Generate a general-purpose image (logo, hero, page art) from a text prompt, store it, and add it to the media library. Returns a URL. Use generate_product_image instead for merch mockups.',
    {
      prompt: { type: 'string', description: 'What the image should look like' },
      filename: { type: 'string', description: 'Optional filename, e.g. logo.png' },
    },
    ['prompt'],
  ),
  fn('update_product', 'Update an existing product. Only provided fields are changed.', {
    id: { type: 'string' },
    name: { type: 'string' },
    price: { type: 'number' },
    description: { type: 'string' },
    tagline: { type: 'string' },
    currency: { type: 'string' },
    imageUrl: { type: 'string' },
    images: { type: 'array', items: { type: 'string' } },
    collectionId: { type: 'string' },
    archived: { type: 'boolean' },
    variantStyle: { type: 'string' },
    variants: { type: 'array', items: VARIANT_ITEM },
    variantStyle2: { type: 'string' },
    variants2: { type: 'array', items: VARIANT_ITEM },
  }, ['id']),
  fn('delete_product', 'Delete a product permanently', {
    id: { type: 'string' },
  }, ['id']),

  fn('list_collections', 'List all collections in the store (including archived)'),
  fn('get_collection', 'Get a single collection by ID', {
    id: { type: 'string' },
  }, ['id']),
  fn('create_collection', 'Create a new collection. Non-archived collections appear in the storefront navbar.', {
    name: { type: 'string' },
    description: { type: 'string' },
    heroImage: { type: 'string', description: 'Hero banner image URL for the collection page' },
    archived: { type: 'boolean' },
  }, ['name']),
  fn('update_collection', 'Update an existing collection. Only provided fields are changed.', {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    heroImage: { type: 'string' },
    archived: { type: 'boolean' },
  }, ['id']),
  fn('delete_collection', 'Delete a collection permanently (also removes it from the navbar)', {
    id: { type: 'string' },
  }, ['id']),

  fn('list_pages', 'List all storefront page-builder pages with their slugs (home, about, and custom pages)'),
  fn('get_page', 'Get a page-builder page by slug, including SEO root props and content blocks', {
    slug: { type: 'string' },
  }, ['slug']),
  fn('create_page', 'Create a new empty page-builder page. Slug must be lowercase letters, numbers, and dashes (e.g. "summer-sale"). Custom pages live at /p/{slug}.', {
    slug: { type: 'string' },
  }, ['slug']),
  fn('update_page', 'Create (if missing) or update a page-builder page. Provide SEO title/description and/or a content array of components.', {
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
  }, ['slug']),
  fn('delete_page', 'Delete a custom page-builder page. Core pages (home, about) cannot be deleted.', {
    slug: { type: 'string' },
  }, ['slug']),

  fn('list_media', 'List media library items (images used across products, collections, pages, and branding)'),
  fn('add_media', 'Add an existing image URL to the media library so it can be reused.', {
    url: { type: 'string' },
    filename: { type: 'string' },
    source: { type: 'string', description: 'Origin label, e.g. link or storage' },
  }, ['url']),
  fn('delete_media', 'Remove a media library item by ID. Does not delete files already referenced on products.', {
    id: { type: 'string' },
  }, ['id']),

  fn('get_store_settings', 'Get store identity, branding, contact, and business settings (logo, name, description, contact email, address)'),
  fn('update_store_settings', 'Update store settings. Only provided fields are changed; the rest are kept. Logo type is "text" or "image". Changing logoText/logoImageUrl updates the navbar brand. There is no separate navigation config — the navbar is Home plus every non-archived collection.', {
    logoType: { type: 'string', enum: ['text', 'image'] },
    logoText: { type: 'string' },
    logoImageUrl: { type: 'string' },
    storeName: { type: 'string' },
    storeDescription: { type: 'string' },
    heroImageUrl: { type: 'string', description: 'Seeds the default Home hero until the Home page is edited' },
    heroTitle: { type: 'string' },
    heroSubtitle: { type: 'string' },
    aboutHeroImageUrl: { type: 'string' },
    aboutHeroTitle: { type: 'string' },
    aboutHeroSubtitle: { type: 'string' },
    aboutContent: { type: 'string' },
    contactEmail: { type: 'string' },
    businessName: { type: 'string' },
    businessAddressLine1: { type: 'string' },
    businessAddressLine2: { type: 'string' },
    businessCity: { type: 'string' },
    businessState: { type: 'string' },
    businessPostalCode: { type: 'string' },
    businessCountry: { type: 'string' },
    productLimit: { type: 'string', description: 'Max products as a number string, or empty for unlimited' },
  }),

  fn('get_theme', 'Get the storefront theme (colors, font, corner radius)'),
  fn('update_theme', 'Update storefront branding colors, font, and corner radius. Only provided fields are changed.', {
    colors: {
      type: 'object',
      properties: {
        primary: { type: 'string', description: 'Hex color, e.g. #1e293b' },
        secondary: { type: 'string' },
        accent: { type: 'string' },
        text: { type: 'string' },
        background: { type: 'string' },
        card: { type: 'string' },
      },
    },
    fontId: { type: 'string', enum: FONT_IDS, description: 'Typography: inter, roboto, montserrat, poppins, or lora' },
    corners: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        radiusMultiplier: { type: 'number', description: '0-4, multiplied by a 12px base when enabled' },
      },
    },
  }),
  fn('reset_theme', 'Reset the storefront theme to OpenShop defaults'),

  fn('get_analytics', 'Get revenue and order analytics for a period', {
    period: { type: 'string', description: 'e.g. 7d, 30d, 90d, all', default: '30d' },
  }),
  fn('list_orders', 'List checkout orders for fulfillment', {
    limit: { type: 'number', description: 'Max 50, default 25' },
    status: { type: 'string', enum: ['open', 'fulfilled'], description: 'open (unfulfilled) or fulfilled' },
  }),
  fn('fulfill_order', 'Mark an order as fulfilled', {
    orderId: { type: 'string' },
  }, ['orderId']),

  fn(
    'get_developer_settings',
    'List developer settings (API keys are shown only as set/unset, never the secret values). Use this to see whether Stripe or OpenRouter is configured.',
  ),
  fn(
    'update_developer_settings',
    'Update non-secret developer settings: OPENROUTER_MODEL, OPENROUTER_IMAGE_MODEL, SITE_URL. Secret keys and the admin password cannot be written through the agent — set those in Developer Settings.',
    {
      OPENROUTER_MODEL: { type: 'string', description: 'OpenRouter model id for the store agent' },
      OPENROUTER_IMAGE_MODEL: { type: 'string', description: 'OpenRouter model id for image generation' },
      SITE_URL: { type: 'string' },
    },
  ),
]

const AGENT_WRITABLE_DEV_KEYS = new Set(
  DEVELOPER_SETTING_FIELDS.filter((field) => !field.secret).map((field) => field.key),
)

export function buildSystemPrompt({ hasReferences = false } = {}) {
  return [
    'You are the OpenShop store agent. You help merchants run their store by reading and writing the same data the admin dashboard can change.',
    'Use the provided tools to persist changes. Prefer listing entities first to find correct IDs/slugs before updating or deleting.',
    'You can configure products (including variants and archive), collections (including hero images — they appear in the navbar), media, page-builder pages, store identity/branding, theme colors/fonts, contact details, and order fulfillment.',
    'Storefront navigation is Home plus every non-archived collection (with product dropdowns) and the logo from store settings. There is no separate nav menu to edit — change collections and branding instead. Custom pages live at /p/{slug}; Home is / and About is /about. Link custom pages from page content (HeroSection primaryPath, etc.).',
    'When asked to "change my site", build or edit pages using the page builder components documented below, and update store settings/theme when the request is about branding.',
    'Be concise in your replies. Summarize exactly what you created, changed, or deleted.',
    'Prices are decimal amounts (e.g. 19.99) in the store currency (USD unless told otherwise).',
    'To sell something that needs a picture, call generate_product_image first, then pass the URL it returns as imageUrl on create_product. Do not invent image URLs.',
    'For logos, heroes, or page artwork, call generate_image and use the returned URL on store settings, collections, or page components.',
    'When generating a merch image, fill the model, pose, product and logo fields separately rather than putting everything in description — each one steers a different part of the picture. Leave pose blank to keep the pose from the reference image.',
    hasReferences
      ? 'The user attached reference images. They are passed to generate_product_image automatically; you do not need to describe or upload them.'
      : 'The user attached no reference images, so describe the model, garment and artwork in words if generating merch.',
    'Do not ask the user to paste secret API keys into chat. Point them at Developer Settings for Stripe, OpenRouter keys, and the admin password.',
    '',
    PAGE_COMPONENTS_DOC,
  ].join('\n')
}

function pick(source, keys) {
  const out = {}
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

function trimProduct(p) {
  if (!p || typeof p !== 'object') return p
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    price: p.price,
    currency: p.currency,
    description: p.description,
    imageUrl: p.imageUrl,
    images: Array.isArray(p.images) ? p.images.slice(0, 5) : undefined,
    collectionId: p.collectionId,
    variantStyle: p.variantStyle,
    variantStyle2: p.variantStyle2,
    variantCount: Array.isArray(p.variants) ? p.variants.length : 0,
    variant2Count: Array.isArray(p.variants2) ? p.variants2.length : 0,
    variants: Array.isArray(p.variants)
      ? p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, hasCustomPrice: v.hasCustomPrice }))
      : undefined,
    variants2: Array.isArray(p.variants2)
      ? p.variants2.map((v) => ({ id: v.id, name: v.name, price: v.price, hasCustomPrice: v.hasCustomPrice }))
      : undefined,
    archived: !!p.archived,
  }
}

function trimTheme(theme) {
  if (!theme || typeof theme !== 'object') return theme
  return {
    colors: theme.colors,
    typography: {
      fontId: theme.typography?.fontId,
      fontLabel: theme.typography?.fontLabel,
    },
    corners: {
      enabled: theme.corners?.enabled,
      radiusMultiplier: theme.corners?.radiusMultiplier,
      radiusPx: theme.corners?.radiusPx,
    },
    updatedAt: theme.meta?.updatedAt ?? null,
  }
}

function productPayload(a, { creating = false } = {}) {
  const payload = pick(a, [
    'name', 'description', 'tagline', 'currency', 'imageUrl', 'images',
    'collectionId', 'archived', 'variantStyle', 'variants', 'variantStyle2', 'variants2',
  ])
  if (a.price !== undefined) payload.price = Number(a.price)
  if (creating && payload.currency === undefined) payload.currency = 'USD'
  if (creating && payload.description === undefined) payload.description = ''
  if (Array.isArray(payload.images)) {
    payload.images = payload.images.filter(Boolean)
  } else if (a.imageUrl && creating) {
    payload.images = [a.imageUrl]
  }
  return payload
}

export function summarizeResult(action, result) {
  // Tool handlers return { status, data }; `body` is the shape dispatch()
  // uses internally. Reading the wrong one made every summary report
  // `undefined` — "Created product "undefined" (undefined)" — even when the
  // product was created correctly, which reads exactly like a failure.
  const b = result.data ?? result.body
  if (!result.ok) {
    const detail = b?.error || `HTTP ${result.status}`
    return `Failed: ${detail}`
  }
  switch (action.tool) {
    case 'generate_product_image':
    case 'generate_image':
      return b?.url ? `Generated an image: ${b.url}` : 'Generated an image'
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
    case 'delete_page':
      return `Deleted page "${action.args.slug}"`
    case 'add_media':
      return `Added media ${b?.id || b?.url || ''}`.trim()
    case 'delete_media':
      return `Deleted media ${action.args.id}`
    case 'update_store_settings':
      return `Updated store settings (${b?.storeName || 'saved'})`
    case 'update_theme':
      return 'Updated storefront theme'
    case 'reset_theme':
      return 'Reset storefront theme to defaults'
    case 'fulfill_order':
      return `Marked order ${action.args.orderId} as fulfilled`
    case 'update_developer_settings':
      return 'Updated developer settings'
    default:
      return `${action.tool} ok`
  }
}

async function executePageTool(dispatch, name, args) {
  const a = args || {}
  const slug = String(a.slug || '').trim()

  if (name === 'get_page') {
    const r = await dispatch(`/api/admin/storefront/pages/${encodeURIComponent(slug)}`)
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
    const r = await dispatch('/api/admin/storefront/pages', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    })
    // Treat "already exists" as success so update_page can upsert.
    if (!r.ok && !String(r.body?.error || '').includes('already exists')) {
      return { status: r.status, data: r.body }
    }
    return { status: 200, data: { slug, created: true } }
  }

  if (name === 'delete_page') {
    const r = await dispatch(`/api/admin/storefront/pages/${encodeURIComponent(slug)}`, { method: 'DELETE' })
    return { status: r.status, data: r.ok ? { slug, deleted: true } : r.body }
  }

  // update_page: merge requested changes onto the existing page (upsert).
  const existing = await dispatch(`/api/admin/storefront/pages/${encodeURIComponent(slug)}`)
  let currentData = existing.ok ? existing.body?.data : null
  if (!currentData) {
    const created = await dispatch('/api/admin/storefront/pages', {
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

  const r = await dispatch(`/api/admin/storefront/pages/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(nextData),
  })
  return { status: r.status, data: r.ok ? { slug, updated: true } : r.body }
}

async function executeThemeUpdate(dispatch, args) {
  const current = await dispatch('/api/admin/storefront/theme')
  if (!current.ok) return { status: current.status, data: current.body }

  const payload = {
    colors: { ...(current.body?.colors || {}), ...(args.colors || {}) },
    typography: {
      fontId: args.fontId || args.typography?.fontId || current.body?.typography?.fontId,
    },
    corners: {
      enabled: args.corners?.enabled ?? current.body?.corners?.enabled,
      radiusMultiplier: args.corners?.radiusMultiplier ?? current.body?.corners?.radiusMultiplier,
    },
  }

  const r = await dispatch('/api/admin/storefront/theme', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return { status: r.status, data: r.ok ? trimTheme(r.body) : r.body }
}

/**
 * Run one agent tool against the live admin API via `dispatch(path, init)`.
 */
export async function executeAgentTool(c, name, args, dispatch) {
  const a = args || {}
  switch (name) {
    case 'list_products': {
      const r = await dispatch('/api/admin/products')
      return { status: r.status, data: Array.isArray(r.body) ? r.body.map(trimProduct) : r.body }
    }
    case 'get_product': {
      const r = await dispatch(`/api/admin/products/${encodeURIComponent(a.id)}`)
      return { status: r.status, data: trimProduct(r.body) }
    }
    case 'create_product': {
      const r = await dispatch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(productPayload(a, { creating: true })),
      })
      return { status: r.status, data: trimProduct(r.body) }
    }
    case 'generate_product_image': {
      const r = await dispatch('/api/admin/ai/generate-merch-image', {
        method: 'POST',
        body: JSON.stringify({
          description: a.description ?? '',
          model: a.model ?? '',
          pose: a.pose ?? '',
          product: a.product ?? '',
          logo: a.logo ?? '',
          references: c.get('merchReferences') || {},
        }),
      })
      return { status: r.status, data: r.body }
    }
    case 'generate_image': {
      const r = await dispatch('/api/admin/ai/generate-and-store', {
        method: 'POST',
        body: JSON.stringify({
          prompt: a.prompt,
          filename: a.filename || 'generated.png',
        }),
      })
      return { status: r.status, data: r.body }
    }
    case 'update_product': {
      const r = await dispatch(`/api/admin/products/${encodeURIComponent(a.id)}`, {
        method: 'PUT',
        body: JSON.stringify(productPayload(a)),
      })
      return { status: r.status, data: trimProduct(r.body) }
    }
    case 'delete_product': {
      const r = await dispatch(`/api/admin/products/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      return { status: r.status, data: r.body ?? null }
    }
    case 'list_collections': {
      const r = await dispatch('/api/admin/collections')
      return { status: r.status, data: r.body }
    }
    case 'get_collection': {
      const r = await dispatch(`/api/admin/collections/${encodeURIComponent(a.id)}`)
      return { status: r.status, data: r.body }
    }
    case 'create_collection': {
      const r = await dispatch('/api/admin/collections', {
        method: 'POST',
        body: JSON.stringify({
          name: a.name,
          description: a.description ?? '',
          heroImage: a.heroImage ?? '',
          archived: !!a.archived,
        }),
      })
      return { status: r.status, data: r.body }
    }
    case 'update_collection': {
      const payload = pick(a, ['name', 'description', 'heroImage', 'archived'])
      const r = await dispatch(`/api/admin/collections/${encodeURIComponent(a.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return { status: r.status, data: r.body }
    }
    case 'delete_collection': {
      const r = await dispatch(`/api/admin/collections/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      return { status: r.status, data: r.body ?? null }
    }
    case 'list_pages': {
      const r = await dispatch('/api/admin/storefront/pages')
      return { status: r.status, data: r.body }
    }
    case 'get_page':
    case 'create_page':
    case 'update_page':
    case 'delete_page':
      return executePageTool(dispatch, name, a)
    case 'list_media': {
      const r = await dispatch('/api/admin/media')
      return { status: r.status, data: r.body }
    }
    case 'add_media': {
      const r = await dispatch('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({
          url: a.url,
          filename: a.filename ?? '',
          source: a.source || 'link',
        }),
      })
      return { status: r.status, data: r.body }
    }
    case 'delete_media': {
      const r = await dispatch(`/api/admin/media/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      return { status: r.status, data: r.body ?? null }
    }
    case 'get_store_settings': {
      const r = await dispatch('/api/admin/store-settings')
      return { status: r.status, data: r.body }
    }
    case 'update_store_settings': {
      const payload = pick(a, [
        'logoType', 'logoText', 'logoImageUrl', 'storeName', 'storeDescription',
        'heroImageUrl', 'heroTitle', 'heroSubtitle',
        'aboutHeroImageUrl', 'aboutHeroTitle', 'aboutHeroSubtitle', 'aboutContent',
        'contactEmail', 'businessName', 'businessAddressLine1', 'businessAddressLine2',
        'businessCity', 'businessState', 'businessPostalCode', 'businessCountry',
        'productLimit',
      ])
      const r = await dispatch('/api/admin/store-settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return { status: r.status, data: r.body }
    }
    case 'get_theme': {
      const r = await dispatch('/api/admin/storefront/theme')
      return { status: r.status, data: r.ok ? trimTheme(r.body) : r.body }
    }
    case 'update_theme':
      return executeThemeUpdate(dispatch, a)
    case 'reset_theme': {
      const r = await dispatch('/api/admin/storefront/theme', { method: 'DELETE' })
      return { status: r.status, data: r.ok ? trimTheme(r.body) : r.body }
    }
    case 'get_analytics': {
      const period = encodeURIComponent(a.period || '30d')
      const r = await dispatch(`/api/admin/analytics?period=${period}`)
      return { status: r.status, data: r.body }
    }
    case 'list_orders': {
      const query = new URLSearchParams()
      if (a.limit) query.set('limit', String(a.limit))
      if (a.status) query.set('status', a.status)
      const suffix = query.toString() ? `?${query}` : ''
      const r = await dispatch(`/api/admin/analytics/orders${suffix}`)
      return { status: r.status, data: r.body }
    }
    case 'fulfill_order': {
      const r = await dispatch(`/api/admin/analytics/orders/${encodeURIComponent(a.orderId)}/fulfill`, {
        method: 'POST',
      })
      return { status: r.status, data: r.body }
    }
    case 'get_developer_settings': {
      const r = await dispatch('/api/admin/developer-settings')
      return { status: r.status, data: r.body }
    }
    case 'update_developer_settings': {
      const updates = {}
      for (const [key, value] of Object.entries(a)) {
        if (!AGENT_WRITABLE_DEV_KEYS.has(key)) {
          return {
            status: 400,
            data: {
              error: `${key} cannot be written through the store agent. Set secret keys and the admin password in Developer Settings.`,
            },
          }
        }
        updates[key] = value
      }
      if (Object.keys(updates).length === 0) {
        return { status: 400, data: { error: 'No writable developer settings provided' } }
      }
      const r = await dispatch('/api/admin/developer-settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      return { status: r.status, data: r.body }
    }
    default:
      return { status: 400, data: { error: `Unknown tool: ${name}` } }
  }
}

export const TOOL_NAMES = TOOL_DEFINITIONS.map((tool) => tool.function.name)
