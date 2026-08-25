const PAGE_VERSION = 1
const MAX_PAGE_BYTES = 50000
const MAX_TEXT_LENGTH = 5000
const MAX_SLUG_LENGTH = 48

export const CORE_PAGE_SLUGS = ['home', 'about']

const RESERVED_PAGE_SLUGS = new Set([
  'admin', 'api', 'assets', 'cart', 'checkout',
  'collections', 'login', 'p', 'products', 'success',
])

const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidPageSlug(slug) {
  return (
    typeof slug === 'string' &&
    slug.length >= 1 &&
    slug.length <= MAX_SLUG_LENGTH &&
    PAGE_SLUG_PATTERN.test(slug) &&
    !RESERVED_PAGE_SLUGS.has(slug)
  )
}

export const PAGE_COMPONENT_PROPS = {
  HeroSection: {
    title: 'string',
    subtitle: 'string',
    imageUrl: 'url',
    primaryLabel: 'string',
    primaryPath: 'url',
    secondaryLabel: 'string',
    secondaryPath: 'url',
  },
  FeaturedProducts: {
    heading: 'string',
    maxItems: 'number',
  },
  ProductGrid: {
    heading: 'string',
    showCollectionFilter: 'boolean',
  },
  RichTextSection: {
    heading: 'string',
    body: 'html',
  },
  ImageTextSection: {
    imageUrl: 'url',
    heading: 'string',
    body: 'string',
    imageAlign: 'enum:left,right',
  },
}

export const ALLOWED_PAGE_COMPONENTS = Object.keys(PAGE_COMPONENT_PROPS)

export function getPageContentKey(slug) {
  assertPageSlug(slug)
  return `storefront:page:${slug}`
}

export function getPageIndexKey() {
  return 'storefront:pages:index'
}

export function assertPageSlug(slug) {
  if (!isValidPageSlug(slug)) {
    throw new Error(`Invalid page slug: ${slug}`)
  }
}

export function createDefaultPageRecord(slug, settings = {}) {
  if (!CORE_PAGE_SLUGS.includes(slug)) {
    throw new Error(`No default content for page slug: ${slug}`)
  }
  const data = slug === 'about'
    ? createDefaultAboutData(settings)
    : createDefaultHomeData(settings)

  return {
    slug,
    version: PAGE_VERSION,
    updatedAt: null,
    data,
  }
}

export function createPageRecord(slug, data, now = new Date()) {
  assertPageSlug(slug)
  const sanitizedData = validatePageData(data)
  return {
    slug,
    version: PAGE_VERSION,
    updatedAt: now.toISOString(),
    data: sanitizedData,
  }
}

export function validatePageRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Invalid page record')
  }

  assertPageSlug(record.slug)

  return {
    slug: record.slug,
    version: PAGE_VERSION,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
    data: validatePageData(record.data),
  }
}

export function validatePageData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Page data must be an object')
  }

  const serialized = JSON.stringify(data)
  if (serialized.length > MAX_PAGE_BYTES) {
    throw new Error('Page data is too large')
  }

  if (!Array.isArray(data.content)) {
    throw new Error('Page data must include a content array')
  }

  if (!data.root || typeof data.root !== 'object' || Array.isArray(data.root)) {
    throw new Error('Page data must include a root object')
  }

  return {
    content: data.content.map(validateContentItem),
    root: {
      ...data.root,
      props: sanitizeRootProps(data.root.props || {}),
    },
  }
}

export const ROOT_PROP_FIELDS = ['title', 'description']

function sanitizeRootProps(props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {}
  const sanitized = {}
  for (const key of ROOT_PROP_FIELDS) {
    const value = props[key]
    if (value === undefined || value === null) continue
    sanitized[key] = sanitizeString(value, 500)
  }
  return sanitized
}

export function validatePageIndexEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Page index entries must be objects')
  }

  assertPageSlug(entry.slug)

  return {
    slug: entry.slug,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
  }
}

export function validatePageIndex(value) {
  if (!Array.isArray(value)) {
    throw new Error('Page index must be an array')
  }

  const seen = new Set()
  const entries = []
  for (const entry of value) {
    const validated = validatePageIndexEntry(entry)
    if (seen.has(validated.slug)) continue
    seen.add(validated.slug)
    entries.push(validated)
  }
  return entries
}

function validateContentItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('Page content entries must be objects')
  }

  if (!ALLOWED_PAGE_COMPONENTS.includes(item.type)) {
    throw new Error(`Unsupported page component: ${item.type}`)
  }

  return {
    type: item.type,
    props: sanitizeProps(item.type, item.props || {}),
  }
}

function sanitizeProps(type, props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    throw new Error(`${type} props must be an object`)
  }

  const schema = PAGE_COMPONENT_PROPS[type]
  const sanitized = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'id') {
      sanitized.id = sanitizeString(value, 128)
      continue
    }

    const expectedType = schema[key]
    if (!expectedType) continue

    sanitized[key] = sanitizeValue(key, value, expectedType)
  }

  return sanitized
}

function sanitizeValue(key, value, expectedType) {
  if (expectedType === 'string') {
    return sanitizeString(value, MAX_TEXT_LENGTH)
  }

  if (expectedType === 'html') {
    return sanitizeHtml(value)
  }

  if (expectedType === 'url') {
    const text = sanitizeString(value, 1000)
    if (!text) return ''
    if (isSafeUrl(text)) return text
    throw new Error(`${key} must be an http, https, or relative URL`)
  }

  if (expectedType === 'number') {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) {
      throw new Error(`${key} must be a number`)
    }
    return Math.max(0, Math.min(Math.round(numberValue), 24))
  }

  if (expectedType === 'boolean') {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    throw new Error(`${key} must be true or false`)
  }

  if (expectedType.startsWith('enum:')) {
    const options = expectedType.replace('enum:', '').split(',')
    const text = sanitizeString(value, 100)
    if (!options.includes(text)) {
      throw new Error(`${key} must be one of: ${options.join(', ')}`)
    }
    return text
  }

  throw new Error(`Unsupported field type for ${key}`)
}

function sanitizeString(value, maxLength) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') {
    throw new Error('Expected a string value')
  }
  return value.slice(0, maxLength)
}

const ALLOWED_HTML_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'a',
])

const HTML_TAG_PATTERN = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)\s*(\/?)\s*>/g

const SCRIPT_STYLE_PATTERN = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi

const HREF_PATTERN = /(?:^|[\s"'])href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))/i

const STYLE_PATTERN = /(?:^|[\s"'])style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))/i

const ALLOWED_TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify'])

function extractTextAlignStyle(attributes) {
  const styleMatch = attributes.match(STYLE_PATTERN)
  const rawStyle = styleMatch ? (styleMatch[1] ?? styleMatch[2] ?? styleMatch[3]) : ''
  const declarations = rawStyle
    .split(';')
    .map((declaration) => declaration.trim().toLowerCase())
    .filter(Boolean)

  if (declarations.length !== 1) return ''

  const [property, value] = declarations[0].split(':').map((part) => part.trim())
  if (property !== 'text-align' || !ALLOWED_TEXT_ALIGN_VALUES.has(value)) return ''

  return ` style="text-align: ${value}"`
}

function escapeHtmlText(text) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function sanitizeHtml(value) {
  const raw = typeof value === 'string' ? value : ''
  const withoutBlocks = raw.slice(0, MAX_TEXT_LENGTH).replace(SCRIPT_STYLE_PATTERN, '')

  let result = ''
  let lastIndex = 0
  let match

  HTML_TAG_PATTERN.lastIndex = 0
  while ((match = HTML_TAG_PATTERN.exec(withoutBlocks)) !== null) {
    result += escapeHtmlText(withoutBlocks.slice(lastIndex, match.index))
    lastIndex = HTML_TAG_PATTERN.lastIndex

    const isClosing = match[1] === '/'
    const tagName = match[2].toLowerCase()
    const isSelfClosing = match[4] === '/'

    if (!ALLOWED_HTML_TAGS.has(tagName)) continue

    if (isClosing) {
      result += `</${tagName}>`
      continue
    }

    let attributes = extractTextAlignStyle(match[3])
    if (tagName === 'a') {
      const hrefMatch = match[3].match(HREF_PATTERN)
      const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3]) : ''
      if (href && isSafeUrl(href)) {
        attributes += ` href="${href.replace(/"/g, '&quot;')}"`
      }
    }

    result += `<${tagName}${attributes}${isSelfClosing ? ' /' : ''}>`
  }

  result += escapeHtmlText(withoutBlocks.slice(lastIndex))

  return result
}

function isSafeUrl(value) {
  if (value.includes('\\')) return false
  if (value.startsWith('#')) return true
  if (value.startsWith('/') && !value.startsWith('//')) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function createDefaultHomeData(settings) {
  return {
    content: [
      {
        type: 'HeroSection',
        props: {
          id: 'home-hero',
          title: settings.heroTitle || 'Welcome to OpenShop',
          subtitle: settings.heroSubtitle || 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.',
          imageUrl: settings.heroImageUrl || '',
          primaryLabel: 'Shop Now',
          primaryPath: '#products',
          secondaryLabel: 'Learn More',
          secondaryPath: '/about',
        },
      },
      {
        type: 'FeaturedProducts',
        props: {
          id: 'featured-products',
          heading: 'Featured Products',
          maxItems: 3,
        },
      },
      {
        type: 'ProductGrid',
        props: {
          id: 'product-grid',
          heading: 'All Products',
          showCollectionFilter: true,
        },
      },
    ],
    root: { props: {} },
  }
}

function createDefaultAboutData(settings) {
  return {
    content: [
      {
        type: 'HeroSection',
        props: {
          id: 'about-hero',
          title: settings.aboutHeroTitle || 'About Us',
          subtitle: settings.aboutHeroSubtitle || 'Learn more about our story and mission',
          imageUrl: settings.aboutHeroImageUrl || '',
          primaryLabel: '',
          primaryPath: '',
          secondaryLabel: '',
          secondaryPath: '',
        },
      },
      {
        type: 'RichTextSection',
        props: {
          id: 'about-content',
          heading: '',
          body: settings.aboutContent || 'Welcome to our store! We are passionate about providing high-quality products and exceptional customer service. Our journey began with a simple idea: to make great products accessible to everyone.\n\nWe believe in quality, sustainability, and building lasting relationships with our customers. Every product in our catalog is carefully selected to meet our high standards.\n\nThank you for choosing us for your shopping needs!',
        },
      },
    ],
    root: { props: {} },
  }
}
