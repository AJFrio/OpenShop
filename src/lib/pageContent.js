const PAGE_VERSION = 1
const MAX_PAGE_BYTES = 50000
const MAX_TEXT_LENGTH = 5000

export const ALLOWED_PAGE_SLUGS = ['home', 'about']

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
    body: 'string',
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

export function assertPageSlug(slug) {
  if (!ALLOWED_PAGE_SLUGS.includes(slug)) {
    throw new Error(`Invalid page slug: ${slug}`)
  }
}

export function createDefaultPageRecord(slug, settings = {}) {
  assertPageSlug(slug)
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
      props: sanitizePlainObject(data.root.props || {}),
    },
  }
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

function sanitizePlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value))
}

function isSafeUrl(value) {
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
