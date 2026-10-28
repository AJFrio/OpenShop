// Admin authentication middleware for Workers
import { getKVNamespace } from '../utils/kv.js'
import { hashToken } from '../utils/crypto.js'
import { ADMIN_TOKEN_TTL_MS, KV_KEYS } from '../config/index.js'

/** Admin paths that skip token auth. Keep in sync with worker.js / tests. */
export const UNAUTHENTICATED_ADMIN_PATHS = new Set([
  '/api/admin/login',
])

/**
 * Delete every hashed admin session in KV (e.g. after a password change).
 * @param {KVNamespace} kvNamespace
 */
export async function purgeAdminSessions(kvNamespace) {
  if (!kvNamespace || typeof kvNamespace.list !== 'function') return

  let cursor
  do {
    const page = await kvNamespace.list({
      prefix: KV_KEYS.ADMIN_TOKEN_PREFIX,
      cursor,
    })
    const keys = page?.keys || []
    await Promise.all(keys.map((entry) => kvNamespace.delete(entry.name)))
    cursor = page?.list_complete === false ? page.cursor : undefined
  } while (cursor)
}

export async function verifyAdminAuth(request, env) {
  // Support both Hono's HonoRequest (c.req) and the native Request
  let adminToken
  try {
    if (request && typeof request.header === 'function') {
      // HonoRequest API
      adminToken = request.header('X-Admin-Token') || request.header('x-admin-token')
    } else if (request && request.headers && typeof request.headers.get === 'function') {
      // Native Request API
      adminToken = request.headers.get('X-Admin-Token') || request.headers.get('x-admin-token')
    } else if (request && request.raw && request.raw.headers && typeof request.raw.headers.get === 'function') {
      // Some frameworks expose the raw Request on .raw
      adminToken = request.raw.headers.get('X-Admin-Token') || request.raw.headers.get('x-admin-token')
    }
  } catch (e) {
    console.error('Auth middleware - error reading admin token header:', e)
  }

  if (!adminToken) {
    return { 
      isValid: false, 
      error: 'Admin authentication required',
      status: 401 
    }
  }

  try {
    // Check if token exists in KV
    const kvNamespace = getKVNamespace(env)
    
    if (!kvNamespace) {
      console.error('Auth middleware - KV namespace is undefined')
      return { 
        isValid: false, 
        error: 'KV namespace not available',
        status: 500 
      }
    }
    
    const hashedToken = await hashToken(adminToken)
    const storageKey = `${KV_KEYS.ADMIN_TOKEN_PREFIX}${hashedToken}`
    const tokenData = await kvNamespace.get(storageKey)
    
    if (!tokenData) {
      return { 
        isValid: false, 
        error: 'Invalid or expired admin token',
        status: 401 
      }
    }

    // Check if token is not expired
    const tokenTime = parseInt(tokenData)
    const now = Date.now()
    
    if (now - tokenTime > ADMIN_TOKEN_TTL_MS) {
      // Clean up expired token
      await kvNamespace.delete(storageKey)
      return { 
        isValid: false, 
        error: 'Admin session expired',
        status: 401 
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('Admin auth verification error:', error)
    return { 
      isValid: false, 
      error: 'Authentication verification failed',
      status: 500 
    }
  }
}
