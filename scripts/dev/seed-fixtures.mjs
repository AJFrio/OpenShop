// Standalone seed fixture factories for local dev (no imports from tests/ — those
// pull in vitest). Shapes mirror docs/generated/kv-data-model.md and the services
// that read them (KVManager, StoreSettingsService, PageContentService).
//
// Output: array of {key, value} entries where value is the JSON string, consumable
// by `wrangler kv bulk put <file> --local`.
export const SEED_EPOCH_ISO = '2025-01-01T00:00:00.000Z'
const SEED_EPOCH_MS = Date.parse(SEED_EPOCH_ISO)

const MEDIA_KEYS = ['media/seed-1.svg', 'media/seed-2.svg', 'media/seed-3.svg']

function imageUrl(mediaKey) {
  return `/api/images/${mediaKey}`
}

export function buildSeedCollections() {
  return [
    {
      id: 'seed-collection-apparel',
      name: 'Apparel',
      description: 'Shirts and hoodies for every day.',
      heroImage: imageUrl(MEDIA_KEYS[0]),
    },
    {
      id: 'seed-collection-gear',
      name: 'Gear',
      description: 'Mugs, stickers, and everyday carry.',
      heroImage: imageUrl(MEDIA_KEYS[1]),
    },
  ]
}

export function buildSeedProducts() {
  return [
    {
      id: 'seed-product-classic-tee',
      name: 'Classic Tee',
      description: 'A soft, heavyweight cotton tee with the OpenShop mark.',
      price: 24,
      currency: 'usd',
      images: [imageUrl(MEDIA_KEYS[0]), imageUrl(MEDIA_KEYS[2])],
      collectionId: 'seed-collection-apparel',
      archived: false,
      variants: [
        { id: 'variant-small', name: 'Small', hasCustomPrice: false },
        { id: 'variant-medium', name: 'Medium', hasCustomPrice: false },
        { id: 'variant-large', name: 'Large', hasCustomPrice: false },
      ],
      variants2: [],
    },
    {
      id: 'seed-product-hoodie',
      name: 'Fleece Hoodie',
      description: 'Brushed fleece hoodie with a kangaroo pocket.',
      price: 59,
      currency: 'usd',
      images: [imageUrl(MEDIA_KEYS[2])],
      collectionId: 'seed-collection-apparel',
      archived: false,
      variants: [],
      variants2: [],
    },
    {
      id: 'seed-product-cap',
      name: 'Embroidered Cap',
      description: 'Six-panel cap with embroidered logo.',
      price: 19.5,
      currency: 'usd',
      images: [imageUrl(MEDIA_KEYS[1])],
      collectionId: 'seed-collection-apparel',
      archived: false,
      variants: [],
      variants2: [],
    },
    {
      id: 'seed-product-mug',
      name: 'Enamel Mug',
      description: 'Camp-style enamel mug, 12oz.',
      price: 14,
      currency: 'usd',
      images: [imageUrl(MEDIA_KEYS[1])],
      collectionId: 'seed-collection-gear',
      archived: false,
      variants: [],
      variants2: [],
    },
    {
      id: 'seed-product-stickers',
      name: 'Sticker Pack',
      description: 'Weatherproof vinyl stickers (pack of 5).',
      price: 8,
      currency: 'usd',
      images: [imageUrl(MEDIA_KEYS[2])],
      collectionId: 'seed-collection-gear',
      archived: false,
      variants: [],
      variants2: [],
    },
    {
      id: 'seed-product-tote',
      name: 'Canvas Tote',
      description: '16oz natural canvas tote with reinforced straps.',
      price: 22,
      currency: 'usd',
      images: [imageUrl(MEDIA_KEYS[0])],
      collectionId: 'seed-collection-gear',
      archived: false,
      variants: [],
      variants2: [],
    },
  ]
}

export function buildSeedMedia() {
  return MEDIA_KEYS.map((key, index) => ({
    id: key,
    url: imageUrl(key),
    source: 'seed',
    filename: `seed-${index + 1}.svg`,
    mimeType: 'image/svg+xml',
    driveFileId: '',
    createdAt: SEED_EPOCH_MS,
    updatedAt: SEED_EPOCH_MS,
  }))
}

export function buildSeedStoreSettings() {
  return {
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: '',
    storeName: 'OpenShop Local Dev',
    storeDescription: 'Local development storefront seeded with fixture data.',
    heroImageUrl: '',
    heroTitle: 'Welcome to OpenShop Local',
    heroSubtitle: 'Seeded fixtures running entirely on your machine.',
    contactEmail: 'dev@localhost.local',
    businessName: '',
    businessAddressLine1: '',
    businessAddressLine2: '',
    businessCity: '',
    businessState: '',
    businessPostalCode: '',
    businessCountry: '',
    productLimit: null,
  }
}

export function buildSeedPages() {
  return [
    {
      slug: 'home',
      version: 1,
      updatedAt: SEED_EPOCH_ISO,
      data: {
        content: [
          {
            type: 'HeroSection',
            props: {
              id: 'home-hero',
              title: 'Welcome to OpenShop Local',
              subtitle: 'A fully local storefront backed by seeded KV fixtures.',
              imageUrl: '',
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
      },
    },
    {
      slug: 'about',
      version: 1,
      updatedAt: SEED_EPOCH_ISO,
      data: {
        content: [
          {
            type: 'HeroSection',
            props: {
              id: 'about-hero',
              title: 'About This Store',
              subtitle: 'Running locally with zero cloud dependencies.',
              imageUrl: '',
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
              heading: 'Our Story',
              body: 'This page is served from the storefront:page:about KV key.\n\nEdit it from the admin UI at /admin to see Puck page-builder content round-trip through local KV.',
            },
          },
        ],
        root: { props: {} },
      },
    },
  ]
}

/**
 * Builds all seed entries as `{key, value}` pairs (value = JSON string), ready for
 * `wrangler kv bulk put`. Index keys are derived from the entities so they can never
 * drift out of sync within a generated file.
 */
export function buildSeedFixtures() {
  const products = buildSeedProducts()
  const collections = buildSeedCollections()
  const media = buildSeedMedia()
  const pages = buildSeedPages()

  const entries = []

  for (const product of products) {
    entries.push({ key: `product:${product.id}`, value: JSON.stringify(product) })
  }
  entries.push({ key: 'products:all', value: JSON.stringify(products.map((p) => p.id)) })

  for (const collection of collections) {
    entries.push({ key: `collection:${collection.id}`, value: JSON.stringify(collection) })
  }
  entries.push({ key: 'collections:all', value: JSON.stringify(collections.map((c) => c.id)) })

  for (const collection of collections) {
    const inCollection = products.filter((p) => p.collectionId === collection.id)
    entries.push({
      key: `collection:products:${collection.id}`,
      value: JSON.stringify(inCollection.map((p) => p.id)),
    })
  }

  for (const item of media) {
    entries.push({ key: `media:${item.id}`, value: JSON.stringify(item) })
  }
  entries.push({ key: 'media:all', value: JSON.stringify(media.map((m) => m.id)) })

  entries.push({ key: 'store:settings', value: JSON.stringify(buildSeedStoreSettings()) })

  for (const page of pages) {
    entries.push({ key: `storefront:page:${page.slug}`, value: JSON.stringify(page) })
  }

  return entries
}
