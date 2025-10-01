const CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes

let cacheEntry = null

export function getStorefrontCache() {
  if (!cacheEntry) return null

  const isExpired = Date.now() - cacheEntry.timestamp > CACHE_TTL_MS
  if (isExpired) {
    cacheEntry = null
    return null
  }

  return cacheEntry.data
}

export function setStorefrontCache(data) {
  cacheEntry = {
    data,
    timestamp: Date.now()
  }
}

export function clearStorefrontCache() {
  cacheEntry = null
}
