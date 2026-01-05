import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from "uuid"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function normalizeImageUrl(url) {
  if (!url) return url || ''
  const val = String(url).trim()
  if (!val || val === 'undefined' || val === 'null') return ''
  
  // Check if it's a Google Drive URL
  const isDrive = val.includes('drive.google.com') || val.includes('drive.usercontent.google.com')
  if (!isDrive) {
    // Return original URL if it's a valid URL, otherwise return empty string
    try {
      new URL(val)
      return val
    } catch {
      return ''
    }
  }
  
  // Extract file ID
  const fileMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  const idMatch = val.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
  const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]) || null
  
  // Return normalized URL or original if no ID found
  return id
    ? `https://drive.usercontent.google.com/download?id=${id}&export=view`
    : val
}

export function formatCurrency(amount, currency = 'USD') {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0
  const currencyCode = (currency || 'USD').toUpperCase()
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(numAmount)
}

export function generateId() {
  return uuidv4()
}
