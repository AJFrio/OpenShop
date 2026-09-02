// Developer settings service - runtime configuration stored in KV.
//
// A Worker cannot write its own secrets: `env` is injected per request and is
// read-only, and changing a Cloudflare secret needs an account-scoped API
// token that has no business living inside a store. So settings a shop owner
// should be able to change without a terminal are kept in KV instead.
//
// Precedence is KV first, `env` second. A value set here genuinely takes
// effect, rather than being shadowed by a stale binding. Clearing a field
// deletes the KV entry and falls back to `env`, which is also the recovery
// path if a bad value is saved:
//
//     wrangler kv key delete developer:settings --namespace-id <id> --remote
//
import { KV_KEYS } from '../config/index.js'
import { randomHex } from '../utils/crypto.js'

/**
 * Settings that may be written from the admin UI.
 *
 * `secret: true` means the value is never returned to the browser — the API
 * reports only whether one is set. `password: true` means it is stored as a
 * salted hash and compared, never read back.
 */
export const DEVELOPER_SETTING_FIELDS = [
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe secret key', secret: true },
  { key: 'GEMINI_API_KEY', label: 'Gemini API key', secret: true },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API key', secret: true },
  { key: 'OPENROUTER_MODEL', label: 'OpenRouter model', secret: false },
  { key: 'SITE_URL', label: 'Site URL', secret: false },
  { key: 'ADMIN_PASSWORD', label: 'Admin password', secret: true, password: true },
]

const FIELDS_BY_KEY = new Map(DEVELOPER_SETTING_FIELDS.map((f) => [f.key, f]))

/** Hash a password with a random salt. Never store or return the plaintext. */
export async function hashPassword(password, salt = randomHex(16)) {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { salt, hash: hex }
}

export class DeveloperSettingsService {
  constructor(kvNamespace) {
    this.kv = kvNamespace
  }

  /** Raw stored settings. Internal — contains secrets. */
  async getRaw() {
    const stored = await this.kv.get(KV_KEYS.DEVELOPER_SETTINGS)
    if (!stored) return {}
    try {
      return JSON.parse(stored)
    } catch {
      // A corrupt blob must not lock the store out of its own settings.
      console.error('[DeveloperSettings] stored settings are not valid JSON; ignoring')
      return {}
    }
  }

  /**
   * Browser-safe view: which keys are set, and where each value comes from.
   * Secret values are never included.
   */
  async getPublicView(env = {}) {
    const stored = await this.getRaw()
    return DEVELOPER_SETTING_FIELDS.map((field) => {
      const inKv = field.password
        ? Boolean(stored.ADMIN_PASSWORD_HASH)
        : stored[field.key] !== undefined && stored[field.key] !== ''
      const inEnv = Boolean(env[field.key])
      return {
        key: field.key,
        label: field.label,
        secret: Boolean(field.secret),
        isPassword: Boolean(field.password),
        configured: inKv || inEnv,
        source: inKv ? 'settings' : (inEnv ? 'environment' : 'unset'),
        // Non-secret values are safe to show so they can be edited in place.
        value: field.secret ? undefined : (stored[field.key] ?? env[field.key] ?? ''),
      }
    })
  }

  /**
   * Write settings. An empty string deletes the entry, restoring the `env`
   * value — that is the documented way to undo a bad override.
   */
  async update(updates) {
    const stored = await this.getRaw()

    for (const [key, value] of Object.entries(updates)) {
      const field = FIELDS_BY_KEY.get(key)
      if (!field || field.password) continue // password has its own path
      if (value === '' || value === null || value === undefined) {
        delete stored[key]
      } else {
        stored[key] = String(value)
      }
    }

    await this.kv.put(KV_KEYS.DEVELOPER_SETTINGS, JSON.stringify(stored))
    return stored
  }

  /** Set the admin password, stored salted-and-hashed. */
  async setAdminPassword(newPassword) {
    const stored = await this.getRaw()
    const { salt, hash } = await hashPassword(newPassword)
    stored.ADMIN_PASSWORD_SALT = salt
    stored.ADMIN_PASSWORD_HASH = hash
    await this.kv.put(KV_KEYS.DEVELOPER_SETTINGS, JSON.stringify(stored))
  }

  /** Remove a UI-set password, falling back to ADMIN_PASSWORD from env. */
  async clearAdminPassword() {
    const stored = await this.getRaw()
    delete stored.ADMIN_PASSWORD_SALT
    delete stored.ADMIN_PASSWORD_HASH
    await this.kv.put(KV_KEYS.DEVELOPER_SETTINGS, JSON.stringify(stored))
  }
}

/**
 * Resolve one setting: KV first, then `env`.
 *
 * Every runtime read of a configurable key should go through this, so a value
 * set in the UI is not silently shadowed by a binding.
 */
export async function resolveSetting(kvNamespace, env, key) {
  try {
    const stored = await new DeveloperSettingsService(kvNamespace).getRaw()
    if (stored[key] !== undefined && stored[key] !== '') return stored[key]
  } catch (error) {
    // KV being unavailable must not take down a request that env can serve.
    console.error(`[DeveloperSettings] KV read failed for ${key}: ${error?.message ?? error}`)
  }
  return env?.[key]
}
