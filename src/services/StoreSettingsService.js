// Store settings service - handles store settings operations
import { KVManager } from '../lib/kv.js'
import { KV_KEYS } from '../config/index.js'

const DEFAULT_SETTINGS = {
  logoType: 'text',
  logoText: 'OpenShop',
  logoImageUrl: '',
  storeName: 'OpenShop',
  storeDescription: 'Your amazing online store',
  heroImageUrl: '',
  heroTitle: 'Welcome to OpenShop',
  heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.',
  contactEmail: 'contact@example.com',
  businessName: '',
  businessAddressLine1: '',
  businessAddressLine2: '',
  businessCity: '',
  businessState: '',
  businessPostalCode: '',
  businessCountry: '',
}

export class StoreSettingsService {
  constructor(kvNamespace) {
    this.kv = new KVManager(kvNamespace)
  }

  /**
   * Get store settings
   */
  async getSettings() {
    const settings = await this.kv.namespace.get(KV_KEYS.STORE_SETTINGS)
    if (settings) {
      return JSON.parse(settings)
    }
    return DEFAULT_SETTINGS
  }

  /**
   * Update store settings
   */
  async updateSettings(settings) {
    // Validation
    if (!settings.logoType || !['text', 'image'].includes(settings.logoType)) {
      throw new Error('Invalid logoType. Must be "text" or "image"')
    }

    const updatedSettings = { ...DEFAULT_SETTINGS, ...settings }
    await this.kv.namespace.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(updatedSettings))
    return updatedSettings
  }

  /**
   * Get contact email
   */
  async getContactEmail() {
    const settings = await this.getSettings()
    return { email: settings.contactEmail || 'contact@example.com' }
  }
}

