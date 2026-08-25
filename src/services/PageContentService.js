import {
  CORE_PAGE_SLUGS,
  assertPageSlug,
  createDefaultPageRecord,
  createPageRecord,
  getPageContentKey,
  getPageIndexKey,
  validatePageIndex,
  validatePageRecord,
} from '../lib/pageContent.js'
import { StoreSettingsService } from './StoreSettingsService.js'
import { NotFoundError } from '../utils/errors.js'

const EMPTY_PAGE_DATA = { content: [], root: { props: {} } }

export class PageContentService {
  constructor(kvNamespace) {
    this.kv = kvNamespace
    this.settingsService = new StoreSettingsService(kvNamespace)
  }

  async readIndex() {
    const raw = await this.kv.get(getPageIndexKey())
    if (!raw) return []
    return validatePageIndex(JSON.parse(raw))
  }

  async writeIndex(entries) {
    await this.kv.put(getPageIndexKey(), JSON.stringify(entries))
  }

  async getPage(slug) {
    const key = getPageContentKey(slug)
    const raw = await this.kv.get(key)

    if (raw) {
      return validatePageRecord(JSON.parse(raw))
    }

    if (!CORE_PAGE_SLUGS.includes(slug)) {
      throw new NotFoundError(`Page not found: ${slug}`)
    }

    const settings = await this.settingsService.getSettings()
    return createDefaultPageRecord(slug, settings)
  }

  async listPages() {
    const entries = await this.readIndex()
    const bySlug = new Map(entries.map((entry) => [entry.slug, entry]))

    const result = []
    for (const slug of CORE_PAGE_SLUGS) {
      const entry = bySlug.get(slug) || { slug, createdAt: null, updatedAt: null }
      result.push(entry)
      bySlug.delete(slug)
    }

    const dynamicPages = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug))
    return [...result, ...dynamicPages]
  }

  async ensureIndexed(slug, updatedAt) {
    const entries = await this.readIndex()
    const now = new Date().toISOString()
    const existing = entries.find((entry) => entry.slug === slug)

    let nextEntries
    if (existing) {
      nextEntries = entries.map((entry) =>
        entry.slug === slug ? { ...entry, updatedAt } : entry
      )
    } else {
      nextEntries = [...entries, { slug, createdAt: now, updatedAt }]
    }

    await this.writeIndex(nextEntries)
  }

  async createPage(slug) {
    assertPageSlug(slug)

    if (CORE_PAGE_SLUGS.includes(slug)) {
      throw new Error(`Page already exists: ${slug}`)
    }

    const existingRecord = await this.kv.get(getPageContentKey(slug))
    const index = await this.readIndex()
    const indexEntry = index.find((entry) => entry.slug === slug)
    if (existingRecord || indexEntry) {
      throw new Error(`Page already exists: ${slug}`)
    }

    const now = new Date().toISOString()
    const emptyRecord = { slug, version: 1, updatedAt: null, data: EMPTY_PAGE_DATA }

    await this.kv.put(getPageContentKey(slug), JSON.stringify(emptyRecord))
    await this.writeIndex([...index, { slug, createdAt: now, updatedAt: null }])

    return emptyRecord
  }

  async deletePage(slug) {
    if (CORE_PAGE_SLUGS.includes(slug)) {
      throw new Error(`Cannot delete core page: ${slug}`)
    }
    assertPageSlug(slug)

    await this.kv.delete(getPageContentKey(slug))
    const entries = await this.readIndex()
    await this.writeIndex(entries.filter((entry) => entry.slug !== slug))
  }

  async updatePage(slug, data) {
    const key = getPageContentKey(slug)
    const record = createPageRecord(slug, data)
    await this.kv.put(key, JSON.stringify(record))
    await this.ensureIndexed(slug, record.updatedAt)
    return record
  }
}
