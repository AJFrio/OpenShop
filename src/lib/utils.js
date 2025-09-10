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
    // Google Drive shared links patterns → convert to direct view link
    if (url.includes('drive.google.com')) {
      // /file/d/<id>/view?...
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//)
      if (fileMatch && fileMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`
      }
      // id param patterns: uc?id=<id>, open?id=<id>, thumbnail?id=<id>
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`
      }
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
