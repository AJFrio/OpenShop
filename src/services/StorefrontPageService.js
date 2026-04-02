import { KV_KEYS } from '../config/index.js'
import { KVManager } from '../lib/kv.js'
import { createDefaultPageRecord, isValidStorefrontPage } from '../lib/storefrontPages.js'

export class StorefrontPageService {
  constructor(kvNamespace) {
    this.kv = new KVManager(kvNamespace)
  }

  getPageKey(pageId) {
    return `${KV_KEYS.STOREFRONT_PAGE_PREFIX}${pageId}`
  }

  async getPage(pageId, settings = {}) {
    if (!isValidStorefrontPage(pageId)) {
      throw new Error(`Unsupported storefront page: ${pageId}`)
    }

    const raw = await this.kv.namespace.get(this.getPageKey(pageId))
    if (!raw) {
      return {
        pageId,
        data: createDefaultPageRecord(pageId, settings),
        meta: {
          updatedAt: null,
          isDefault: true,
        },
      }
    }

    try {
      const parsed = JSON.parse(raw)
      return {
        pageId,
        data: parsed.data || createDefaultPageRecord(pageId, settings),
        meta: {
          updatedAt: parsed.updatedAt || null,
          isDefault: false,
        },
      }
    } catch (error) {
      console.error(`Invalid storefront page JSON for ${pageId}:`, error)
      return {
        pageId,
        data: createDefaultPageRecord(pageId, settings),
        meta: {
          updatedAt: null,
          isDefault: true,
          invalidStoredData: true,
        },
      }
    }
  }

  async updatePage(pageId, data) {
    if (!isValidStorefrontPage(pageId)) {
      throw new Error(`Unsupported storefront page: ${pageId}`)
    }

    if (!data || typeof data !== 'object' || !Array.isArray(data.content)) {
      throw new Error('Invalid Puck page data')
    }

    const record = {
      data,
      updatedAt: Date.now(),
    }

    await this.kv.namespace.put(this.getPageKey(pageId), JSON.stringify(record))

    return {
      pageId,
      data: record.data,
      meta: {
        updatedAt: record.updatedAt,
        isDefault: false,
      },
    }
  }

  async resetPage(pageId, settings = {}) {
    if (!isValidStorefrontPage(pageId)) {
      throw new Error(`Unsupported storefront page: ${pageId}`)
    }

    await this.kv.namespace.delete(this.getPageKey(pageId))

    return {
      pageId,
      data: createDefaultPageRecord(pageId, settings),
      meta: {
        updatedAt: null,
        isDefault: true,
      },
    }
  }
}
