import {
  createDefaultPageRecord,
  createPageRecord,
  getPageContentKey,
  validatePageRecord,
} from '../lib/pageContent.js'
import { StoreSettingsService } from './StoreSettingsService.js'

export class PageContentService {
  constructor(kvNamespace) {
    this.kv = kvNamespace
    this.settingsService = new StoreSettingsService(kvNamespace)
  }

  async getPage(slug) {
    const key = getPageContentKey(slug)
    const raw = await this.kv.get(key)

    if (raw) {
      return validatePageRecord(JSON.parse(raw))
    }

    const settings = await this.settingsService.getSettings()
    return createDefaultPageRecord(slug, settings)
  }

  async updatePage(slug, data) {
    const key = getPageContentKey(slug)
    const record = createPageRecord(slug, data)
    await this.kv.put(key, JSON.stringify(record))
    return record
  }
}
