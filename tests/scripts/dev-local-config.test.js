// Tests for the local dev harness: config generator + seed fixtures.
// The generator mirrors template.toml.example semantics for zero-cloud local dev;
// fixtures must validate against docs/generated/kv-data-model.md shapes.
import { describe, it, expect } from 'vitest'
import {
  generateWranglerToml,
  generateDevVars,
  generateEnvLocal,
  GENERATED_MARKER,
  LOCAL_KV_ID,
  LOCAL_SITE_URL,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_STRIPE_SENTINEL,
} from '../../scripts/dev/build-local-config.mjs'
import { buildSeedFixtures } from '../../scripts/dev/seed-fixtures.mjs'

/**
 * Minimal TOML-subset parser: enough to prove the generated config is
 * structurally parseable (comments, [table], [[array-of-tables]],
 * string/boolean/number values, arrays of strings).
 */
function parseTomlSubset(text) {
  const root = {}
  let current = root

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const tableMatch = line.match(/^\[([^[\]]+)\]$/)
    if (tableMatch) {
      current = ensureTable(root, tableMatch[1])
      continue
    }

    const arrayTableMatch = line.match(/^\[\[([^[\]]+)\]\]$/)
    if (arrayTableMatch) {
      const parent = ensureParent(root, arrayTableMatch[1])
      const name = arrayTableMatch[1].split('.').pop()
      if (!Array.isArray(parent[name])) parent[name] = []
      const entry = {}
      parent[name].push(entry)
      current = entry
      continue
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/)
    if (!kvMatch) {
      throw new Error(`Unparseable TOML line: ${rawLine}`)
    }
    current[kvMatch[1]] = parseTomlValue(kvMatch[2].trim())
  }

  return root
}

function ensureTable(root, path_) {
  const parts = path_.split('.')
  let node = root
  for (const part of parts) {
    if (Array.isArray(node[part])) {
      node = node[part][node[part].length - 1]
    } else {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {}
      node = node[part]
    }
  }
  return node
}

function ensureParent(root, path_) {
  const parts = path_.split('.')
  parts.pop()
  if (parts.length === 0) return root
  return ensureTable(root, parts.join('.'))
}

function parseTomlValue(text) {
  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map((item) => parseTomlValue(item.trim()))
  }
  throw new Error(`Unsupported TOML value: ${text}`)
}

function parseVarsFile(text) {
  const vars = {}
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) throw new Error(`Unparseable vars line: ${rawLine}`)
    vars[line.slice(0, eq)] = line.slice(eq + 1)
  }
  return vars
}

function entriesByKey(fixtures) {
  return new Map(fixtures.map((entry) => [entry.key, entry.value]))
}

describe('build-local-config generator', () => {
  it('produces parseable TOML with worker entrypoint and nodejs_compat', () => {
    const config = parseTomlSubset(generateWranglerToml())
    expect(config.main).toBe('src/worker.js')
    expect(config.compatibility_flags).toContain('nodejs_compat')
  })

  it('declares a YOUR_STORE_KV binding with a dummy 32-hex namespace id', () => {
    expect(LOCAL_KV_ID).toMatch(/^[0-9a-f]{32}$/)
    const config = parseTomlSubset(generateWranglerToml())
    expect(Array.isArray(config.kv_namespaces)).toBe(true)
    const kv = config.kv_namespaces.find((ns) => ns.binding === 'YOUR_STORE_KV')
    expect(kv).toBeDefined()
    expect(kv.id).toMatch(/^[0-9a-f]{32}$/)
  })

  it('serves dist via an ASSETS-bound [assets] table', () => {
    const config = parseTomlSubset(generateWranglerToml())
    expect(config.assets.directory).toBe('dist')
    expect(config.assets.binding).toBe('ASSETS')
  })

  it('binds a local-only IMAGES R2 bucket', () => {
    const config = parseTomlSubset(generateWranglerToml())
    expect(config.r2_buckets[0].binding).toBe('IMAGES')
    expect(config.r2_buckets[0].bucket_name).toBe('local-images')
  })

  it('points SITE_URL at the local worker port', () => {
    const config = parseTomlSubset(generateWranglerToml())
    expect(config.vars.SITE_URL).toBe(LOCAL_SITE_URL)
    expect(LOCAL_SITE_URL).toBe('http://localhost:8787')
  })

  it('marks the file as generator-owned so hand edits are never silently clobbered', () => {
    expect(generateWranglerToml()).toContain(GENERATED_MARKER)
  })
})

describe('.dev.vars generation', () => {
  const vars = parseVarsFile(generateDevVars())

  it('provides ADMIN_PASSWORD for the login route', () => {
    expect(vars.ADMIN_PASSWORD).toBeTruthy()
    expect(vars.ADMIN_PASSWORD).toBe(LOCAL_ADMIN_PASSWORD)
  })

  it('sets SITE_URL to the local worker origin', () => {
    expect(vars.SITE_URL).toBe('http://localhost:8787')
  })

  it('uses the reserved no-network Stripe sentinel key', () => {
    expect(vars.STRIPE_SECRET_KEY).toMatch(/^sk_test_/)
    expect(vars.STRIPE_SECRET_KEY).toBe(LOCAL_STRIPE_SENTINEL)
    expect(LOCAL_STRIPE_SENTINEL).toBe('sk_test_local_no_network')
  })

  it('keeps client-side VITE_ vars out of worker secrets', () => {
    const viteKeys = Object.keys(vars).filter((key) => key.startsWith('VITE_'))
    expect(viteKeys).toEqual([])
  })
})

describe('.env.local generation (VITE_ vars)', () => {
  const vars = parseVarsFile(generateEnvLocal())

  it('provides a dummy Stripe publishable key for the storefront', () => {
    expect(vars.VITE_STRIPE_PUBLISHABLE_KEY).toMatch(/^pk_test_/)
  })

  it('only contains VITE_-prefixed keys', () => {
    const nonVite = Object.keys(vars).filter((key) => !key.startsWith('VITE_'))
    expect(nonVite).toEqual([])
  })
})

describe('seed fixtures vs docs/generated/kv-data-model.md', () => {
  const fixtures = buildSeedFixtures()
  const byKey = entriesByKey(fixtures)

  it('emits wrangler kv bulk put entries ({key, value} strings, unique keys)', () => {
    expect(Array.isArray(fixtures)).toBe(true)
    for (const entry of fixtures) {
      expect(typeof entry.key).toBe('string')
      expect(typeof entry.value).toBe('string')
    }
    const keys = fixtures.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('indexes products:all with ids of written product documents', () => {
    const ids = JSON.parse(byKey.get('products:all'))
    expect(ids.length).toBeGreaterThanOrEqual(6)
    for (const id of ids) {
      const product = JSON.parse(byKey.get(`product:${id}`))
      expect(product.id).toBe(id)
    }
  })

  it('matches the documented product shape', () => {
    const ids = JSON.parse(byKey.get('products:all'))
    for (const id of ids) {
      const product = JSON.parse(byKey.get(`product:${id}`))
      expect(typeof product.name).toBe('string')
      expect(typeof product.description).toBe('string')
      expect(typeof product.price).toBe('number')
      expect(Array.isArray(product.images)).toBe(true)
      expect(product.images.length).toBeGreaterThan(0)
      expect(Array.isArray(product.variants)).toBe(true)
      expect(product.archived).toBe(false)
      expect(['string', 'undefined']).toContain(typeof product.collectionId)
    }
  })

  it('spreads products across at least two collections with consistent indexes', () => {
    const collectionIds = JSON.parse(byKey.get('collections:all'))
    expect(collectionIds.length).toBeGreaterThanOrEqual(2)

    const productIds = JSON.parse(byKey.get('products:all'))
    const indexed = new Set()
    for (const collectionId of collectionIds) {
      const collection = JSON.parse(byKey.get(`collection:${collectionId}`))
      expect(collection.id).toBe(collectionId)
      expect(typeof collection.name).toBe('string')

      const inCollection = JSON.parse(byKey.get(`collection:products:${collectionId}`))
      for (const productId of inCollection) {
        const product = JSON.parse(byKey.get(`product:${productId}`))
        expect(product.collectionId).toBe(collectionId)
        indexed.add(productId)
      }
    }
    for (const productId of productIds) {
      expect(indexed.has(productId)).toBe(true)
    }
  })

  it('matches the documented media shape and covers referenced image keys', () => {
    const mediaIds = JSON.parse(byKey.get('media:all'))
    expect(mediaIds.length).toBeGreaterThanOrEqual(3)

    const mediaKeys = new Set()
    for (const id of mediaIds) {
      const media = JSON.parse(byKey.get(`media:${id}`))
      expect(media.id).toBe(id)
      expect(typeof media.url).toBe('string')
      expect(typeof media.source).toBe('string')
      expect(typeof media.filename).toBe('string')
      expect(typeof media.mimeType).toBe('string')
      expect(typeof media.driveFileId).toBe('string')
      expect(typeof media.createdAt).toBe('number')
      expect(typeof media.updatedAt).toBe('number')
      mediaKeys.add(id)
    }

    const productIds = JSON.parse(byKey.get('products:all'))
    for (const id of productIds) {
      const product = JSON.parse(byKey.get(`product:${id}`))
      for (const imageUrl of product.images) {
        expect(imageUrl.startsWith('/api/images/')).toBe(true)
        expect(mediaKeys.has(imageUrl.replace('/api/images/', ''))).toBe(true)
      }
    }
  })

  it('seeds store:settings matching the StoreSettings shape', () => {
    const settings = JSON.parse(byKey.get('store:settings'))
    expect(['text', 'image']).toContain(settings.logoType)
    expect(typeof settings.storeName).toBe('string')
    expect(settings.contactEmail).toContain('@')
    expect(typeof settings.storeDescription).toBe('string')
  })

  it('seeds storefront pages for home and about in Puck content shape', () => {
    const allowedComponents = [
      'HeroSection',
      'FeaturedProducts',
      'ProductGrid',
      'RichTextSection',
      'ImageTextSection',
    ]
    for (const slug of ['home', 'about']) {
      const page = JSON.parse(byKey.get(`storefront:page:${slug}`))
      expect(page.slug).toBe(slug)
      expect(page.version).toBe(1)
      expect(page.updatedAt === null || typeof page.updatedAt === 'string').toBe(true)
      expect(Array.isArray(page.data.content)).toBe(true)
      expect(page.data.content.length).toBeGreaterThan(0)
      for (const block of page.data.content) {
        expect(allowedComponents).toContain(block.type)
        expect(typeof block.props).toBe('object')
      }
      expect(typeof page.data.root.props).toBe('object')
    }
  })
})
