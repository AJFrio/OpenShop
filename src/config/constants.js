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

// Raster MIME types the image proxy may serve from the OpenShop origin.
// SVG/HTML/script types are rejected so Drive files cannot become XSS.
export const ALLOWED_PROXY_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]

export const IMAGE_PROXY_CSP = "default-src 'none'; style-src 'unsafe-inline'"

// Cart / checkout bounds (shared by storefront UI and checkout routes)
export const CART_MAX_ITEMS = 100
export const CART_MAX_ITEM_QUANTITY = 100

// Resource IDs used in URL params and KV keys
export const MAX_RESOURCE_ID_LENGTH = 128

// Admin token expiration (24 hours in milliseconds)
export const ADMIN_TOKEN_TTL = 86400 // seconds
export const ADMIN_TOKEN_TTL_MS = 86400000 // milliseconds

// KV key prefixes
// The password a fresh install ships with. Login reports when it is still in
// use so the admin panel can require a change before anything else.
export const DEFAULT_ADMIN_PASSWORD = 'admin123'

export const KV_KEYS = {
  PRODUCTS_LIST: 'products:all',
  COLLECTIONS_LIST: 'collections:all',
  MEDIA_LIST: 'media:all',
  STORE_SETTINGS: 'store:settings',
  STOREFRONT_PAGE_PREFIX: 'storefront:page:',
  DRIVE_TOKEN: 'drive:oauth:tokens',
  DRIVE_FOLDER_PREFIX: 'drive:folder',
  ADMIN_TOKEN_PREFIX: 'admin_token:',
  DEVELOPER_SETTINGS: 'developer:settings',
}

// Theme validation constants
export const THEME_COLOR_KEYS = ['primary', 'secondary', 'accent', 'text', 'background', 'card']
export const THEME_RADIUS_MULTIPLIER_MIN = 0
export const THEME_RADIUS_MULTIPLIER_MAX = 4

