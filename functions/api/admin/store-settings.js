// Admin-only Store Settings API with authentication
import { KVManager } from '../../../src/lib/kv.js'
import { verifyAdminAuth, createAuthErrorResponse } from './auth-middleware.js'

const STORE_SETTINGS_KEY = 'store:settings'

// Default store settings
const DEFAULT_SETTINGS = {
  logoType: 'text',
  logoText: 'OpenShop',
  logoImageUrl: '',
  storeName: 'OpenShop',
  storeDescription: 'Your amazing online store',
}

export async function onRequestPut({ request, env }) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request, env)
  if (!authResult.isValid) {
    return createAuthErrorResponse(authResult.error, authResult.status)
  }

  try {
    const settings = await request.json()
    const kv = new KVManager(env.OPENSHOP_KV)

    // Validate required fields
    if (!settings.logoType || !['text', 'image'].includes(settings.logoType)) {
      return new Response(JSON.stringify({ error: 'Invalid logoType. Must be "text" or "image"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (settings.logoType === 'text' && !settings.logoText?.trim()) {
      return new Response(JSON.stringify({ error: 'logoText is required when logoType is "text"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (settings.logoType === 'image' && !settings.logoImageUrl?.trim()) {
      return new Response(JSON.stringify({ error: 'logoImageUrl is required when logoType is "image"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Merge with defaults to ensure all fields are present
    const updatedSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    }

    // Save to KV
    await kv.namespace.put(STORE_SETTINGS_KEY, JSON.stringify(updatedSettings))

    return new Response(JSON.stringify(updatedSettings), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating store settings:', error)
    return new Response(JSON.stringify({ error: 'Failed to update store settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
