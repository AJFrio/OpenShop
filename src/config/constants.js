// Configuration constants
// These values can be overridden via environment variables

// CORS origins - restrict to specific domains in production
// This function should be called with env to get the actual CORS origins
export function getCorsOrigins(env) {
  // In Workers, env variables are available directly
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  }
  
  // Fallback to SITE_URL if available
  if (env.SITE_URL) {
    return [env.SITE_URL]
  }
  
  // Last resort: return wildcard (should be restricted in production)
  return ['*']
}

// Default export for backward compatibility (will use wildcard)
export const CORS_ORIGINS = ['*'] // DEPRECATED: Use getCorsOrigins(env) instead
export const CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
export const CORS_ALLOWED_HEADERS = ['Content-Type', 'X-Admin-Token']

// Shipping countries for Stripe checkout
export const SHIPPING_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 
  'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ', 'HU', 'GR', 'RO', 'BG', 
  'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'LU', 'MT', 'CY'
]

// Google Drive allowed hosts for image proxy
export const ALLOWED_DRIVE_HOSTS = [
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
]

// Admin token expiration (24 hours in milliseconds)
export const ADMIN_TOKEN_TTL = 86400 // seconds
export const ADMIN_TOKEN_TTL_MS = 86400000 // milliseconds

// KV key prefixes
export const KV_KEYS = {
  PRODUCTS_LIST: 'products:all',
  COLLECTIONS_LIST: 'collections:all',
  MEDIA_LIST: 'media:all',
  STORE_SETTINGS: 'store:settings',
  DRIVE_TOKEN: 'drive:oauth:tokens',
  DRIVE_FOLDER_PREFIX: 'drive:folder',
  ADMIN_TOKEN_PREFIX: 'admin_token:',
}

// Theme validation constants
export const THEME_COLOR_KEYS = ['primary', 'secondary', 'accent', 'text', 'background', 'card']
export const THEME_RADIUS_MULTIPLIER_MIN = 0
export const THEME_RADIUS_MULTIPLIER_MAX = 4

