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
