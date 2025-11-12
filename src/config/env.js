// Environment variable validation and access

/**
 * Validates that required environment variables are present
 * @param {Record<string, any>} env - Environment object
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEnv(env) {
  const required = ['STRIPE_SECRET_KEY', 'SITE_URL']
  const missing = required.filter(key => !env[key])
  
  return {
    valid: missing.length === 0,
    missing
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

