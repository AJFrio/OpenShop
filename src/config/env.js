// Environment variable validation and access

/**
 * Validates that required environment variables are present
 * @param {Record<string, any>} env - Environment object
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEnv(env) {
  // STRIPE_SECRET_KEY is intentionally not required. Without it the store
  // runs in catalogue-only mode: products can be created and edited, and
  // checkout refuses with a 503. Requiring it here would report a store as
  // invalid when it is merely not selling yet.
  const required = ['SITE_URL']
  const missing = required.filter(key => !env[key])

  return {
    valid: missing.length === 0,
    missing,
    paymentsEnabled: Boolean(env.STRIPE_SECRET_KEY),
  }
}

/**
 * Gets environment variable with optional default
 * @param {Record<string, any>} env - Environment object
 * @param {string} key - Environment variable key
 * @param {any} defaultValue - Default value if not found
 * @returns {any}
 */
export function getEnv(env, key, defaultValue = undefined) {
  return env[key] ?? defaultValue
}

