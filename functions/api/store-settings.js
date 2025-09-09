// Cloudflare Function for Store Settings API
import { KVManager } from '../../src/lib/kv.js'

const STORE_SETTINGS_KEY = 'store:settings'

// Default store settings
const DEFAULT_SETTINGS = {
  logoType: 'text', // 'text' or 'image'
  logoText: 'OpenShop',
  logoImageUrl: '',
  storeName: 'OpenShop',
  storeDescription: 'Your amazing online store',
  // Future settings can be added here
}

export async function onRequestGet({ env }) {
  try {
    const kv = new KVManager(env.OPENSHOP_KV)
    
    // Try to get existing settings
    const existingSettings = await kv.namespace.get(STORE_SETTINGS_KEY)
    
    if (existingSettings) {
      const settings = JSON.parse(existingSettings)
      return new Response(JSON.stringify(settings), {
        headers: { 'Content-Type': 'application/json' },
      })
    } else {
      // Return default settings if none exist
      return new Response(JSON.stringify(DEFAULT_SETTINGS), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('Error fetching store settings:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch store settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// PUT method removed - use /api/admin/store-settings for admin operations
export async function onRequestPut({ request, env }) {
  return new Response(JSON.stringify({ 
    error: 'Unauthorized. Use admin endpoints for write operations.' 
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
