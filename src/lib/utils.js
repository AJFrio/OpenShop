import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Generate UUID for products and collections
export function generateId() {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Format currency
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Normalize common third-party image URLs (e.g., Google Drive) to direct-view links
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return url
  try {
    // Route Google Drive images through our proxy to avoid 403/CORS
    const needsProxy = url.includes('drive.google.com') || url.includes('drive.usercontent.google.com')
    if (needsProxy) {
      // Try to extract the id to normalize the src param
      let id = null
      const fileMatch = url.match(/\/(?:file|uc)\/d\/([a-zA-Z0-9_-]+)/)
      const idMatch = url.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
      if (fileMatch && fileMatch[1]) id = fileMatch[1]
      else if (idMatch && idMatch[1]) id = idMatch[1]
      const srcParam = id ? `https://drive.usercontent.google.com/download?id=${id}&export=view` : url
      return `/api/image-proxy?src=${encodeURIComponent(srcParam)}`
    }

    // Google Drive shared links patterns → convert to direct view link
    if (url.includes('drive.google.com')) {
      // Common forms we support and convert to: https://drive.google.com/uc?export=view&id=<id>
      // 1) https://drive.google.com/file/d/<id>/view?usp=sharing
      // 2) https://drive.google.com/open?id=<id>
      // 3) https://drive.google.com/uc?id=<id>&export=download
      // 4) https://drive.google.com/thumbnail?id=<id>
      // 5) https://drive.google.com/drive/folders/<id>?usp=sharing (not an image; ignore)

      // /file/d/<id>/...
      const fileMatch = url.match(/\/(?:file|uc)\/d\/([a-zA-Z0-9_-]+)/)
      if (fileMatch && fileMatch[1]) {
        return `https://drive.usercontent.google.com/download?id=${fileMatch[1]}&export=view`
      }
      // id param patterns: id=<id>
      const idMatch = url.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
      if (idMatch && idMatch[1]) {
        return `https://drive.usercontent.google.com/download?id=${idMatch[1]}&export=view`
      }
      // Sharing link copied from UI sometimes has usp params; fallback to replacing domain path forms
      try {
        const u = new URL(url)
        // If path contains /file/d or /thumbnail, already handled; otherwise leave untouched
        if (u.hostname === 'drive.google.com') {
          // Nothing else we can confidently normalize
          return url
        }
      } catch (_) {}
    }

    // Already in usercontent form → normalize query params (ensure export=view)
    if (url.includes('drive.usercontent.google.com')) {
      try {
        const u = new URL(url)
        const id = u.searchParams.get('id')
        if (id) {
          u.pathname = '/download'
          u.searchParams.set('id', id)
          u.searchParams.set('export', 'view')
          return u.toString()
        }
      } catch (_) {}
    }
  } catch (_) {
    // ignore
  }
  return url
}

// KV key generators
export function getProductKey(id) {
  return `product:${id}`
}

export function getCollectionKey(id) {
  return `collection:${id}`
}

export function getAllProductsKey() {
  return 'products:all'
}

export function getAllCollectionsKey() {
  return 'collections:all'
}
