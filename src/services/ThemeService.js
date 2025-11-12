// Theme service - handles theme operations
import { getKVNamespace } from '../utils/kv.js'
import { DEFAULT_STORE_THEME, THEME_KV_KEY, resolveStorefrontTheme, sanitizeThemeInput } from '../lib/theme.js'

export class ThemeService {
  constructor(env) {
    this.env = env
    this.kv = getKVNamespace(env)
  }

  /**
   * Get storefront theme
   */
  async getTheme() {
    try {
      const kvTheme = this.kv ? await this.kv.get(THEME_KV_KEY) : null
      let storedTheme = null

      if (kvTheme) {
        try {
          storedTheme = JSON.parse(kvTheme)
        } catch (parseError) {
          console.error('Invalid theme JSON in KV, falling back to defaults:', parseError)
        }
      }

      return resolveStorefrontTheme(storedTheme || DEFAULT_STORE_THEME)
    } catch (error) {
      console.error('Error fetching storefront theme:', error)
      return resolveStorefrontTheme(DEFAULT_STORE_THEME)
    }
  }

  /**
   * Update storefront theme
   */
  async updateTheme(payload) {
    if (!this.kv) {
      throw new Error('KV namespace unavailable')
    }

    const sanitized = sanitizeThemeInput(payload)
    const record = {
      theme: sanitized,
      updatedAt: Date.now(),
    }

    await this.kv.put(THEME_KV_KEY, JSON.stringify(record))
    return resolveStorefrontTheme(record)
  }

  /**
   * Reset storefront theme to defaults
   */
  async resetTheme() {
    if (!this.kv) {
      throw new Error('KV namespace unavailable')
    }

    await this.kv.delete(THEME_KV_KEY)
    return resolveStorefrontTheme(DEFAULT_STORE_THEME)
  }
}

