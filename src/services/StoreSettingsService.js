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
  aboutHeroImageUrl: '',
  aboutHeroTitle: 'About Us',
  aboutHeroSubtitle: 'Learn more about our story and mission',
  aboutContent: 'Welcome to our store! We are passionate about providing high-quality products and exceptional customer service.',
  contactEmail: 'contact@example.com',
  businessName: '',
  businessAddressLine1: '',
  businessAddressLine2: '',
  businessCity: '',
  businessState: '',
  businessPostalCode: '',
  businessCountry: '',
  productLimit: null,
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
      const parsed = JSON.parse(settings)
      // Merge with defaults to ensure all fields are present
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
    return DEFAULT_SETTINGS
  }

  /**
   * Update store settings
   */
  async updateSettings(settings) {
    // Merge onto current settings so a partial PUT (the store agent, or any
    // client that only sends the fields it is changing) does not reset
    // identity, contact, or branding fields back to defaults.
    const current = await this.getSettings()
    const updatedSettings = { ...current, ...settings }

    if (!updatedSettings.logoType || !['text', 'image'].includes(updatedSettings.logoType)) {
      throw new Error('Invalid logoType. Must be "text" or "image"')
    }

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

