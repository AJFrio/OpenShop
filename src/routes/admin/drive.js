// Admin Google Drive routes
import { Hono } from 'hono'
import { DriveService } from '../../services/DriveService.js'
import { generateSessionToken } from '../../utils/crypto.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// Get Drive connection status
router.get('/status', asyncHandler(async (c) => {
  const driveService = new DriveService(c.env)
  const status = await driveService.getConnectionStatus()
  return c.json(status)
}))

// Disconnect Drive
router.post('/disconnect', asyncHandler(async (c) => {
  const driveService = new DriveService(c.env)
  await driveService.disconnect()
  return c.json({ success: true })
}))

// Start OAuth flow
router.get('/oauth/start', asyncHandler(async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}/api/admin/drive/oauth/callback`
  
  if (!clientId || !redirectUri) {
    throw new Error('Drive OAuth not configured')
  }
  
  const params = new URLSearchParams()
  params.set('response_type', 'code')
  params.set('client_id', clientId)
  params.set('redirect_uri', redirectUri)
  params.set('scope', 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file')
  params.set('access_type', 'offline')
  params.set('prompt', 'consent')
  params.set('include_granted_scopes', 'true')
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return c.redirect(url, 302)
}))

// OAuth callback
router.get('/oauth/callback', asyncHandler(async (c) => {
  const code = c.req.query('code')
  if (!code) {
    return c.text('Missing code', 400)
  }
  
  const clientId = c.env.GOOGLE_CLIENT_ID
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET
  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}/api/admin/drive/oauth/callback`
  
  if (!clientId || !clientSecret) {
    return c.text('OAuth not configured', 500)
  }
  
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })
  
  if (!tokenRes.ok) {
    const t = await tokenRes.text()
    console.error('Token exchange failed', t)
    return c.text('Token exchange failed', 500)
  }
  
  const tokens = await tokenRes.json()
  const now = Math.floor(Date.now() / 1000)
  const record = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry: now + (tokens.expires_in || 3600) - 30
  }
  
  const { getKVNamespace } = await import('../../utils/kv.js')
  const { KV_KEYS } = await import('../../config/index.js')
  const kv = getKVNamespace(c.env)
  if (kv) {
    await kv.put(KV_KEYS.DRIVE_TOKEN, JSON.stringify(record))
  }
  
  return c.html(`<!doctype html><html><body><p>Google Drive connected. You can close this window.</p><script>setTimeout(()=>window.close(),500)</script></body></html>`)
}))

// Upload file to Drive
router.post('/upload', asyncHandler(async (c) => {
  const { mimeType, dataBase64, filename } = await c.req.json()
  
  if (!mimeType || !dataBase64) {
    throw new ValidationError('Missing mimeType or dataBase64')
  }
  
  const driveService = new DriveService(c.env)
  
  try {
    const result = await driveService.uploadFile(mimeType, dataBase64, filename)
    return c.json(result)
  } catch (e) {
    const msg = String(e && e.message ? e.message : e)
    if (/Drive not connected/i.test(msg)) {
      return c.json({ error: 'Drive not connected. Please connect Google Drive in Admin.' }, 502)
    }
    if (/Failed to refresh token/i.test(msg)) {
      return c.json({ error: 'Drive session expired. Please reconnect Google Drive.' }, 502)
    }
    throw e
  }
}))

// Get picker configuration
router.get('/picker-config', asyncHandler(async (c) => {
  const driveService = new DriveService(c.env)
  
  try {
    const config = await driveService.getPickerConfig()
    return c.json(config)
  } catch (e) {
    const msg = String(e && e.message ? e.message : e)
    if (/Drive not connected/i.test(msg) || /Failed to refresh token/i.test(msg)) {
      return c.json({ error: 'Drive not connected' }, 502)
    }
    throw e
  }
}))

// Copy files to Drive
router.post('/copy', asyncHandler(async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const fileIds = Array.isArray(body.fileIds) && body.fileIds.length > 0
    ? body.fileIds
    : (body.fileId ? [body.fileId] : [])
  const resourceKeyById = (body && body.resourceKeys && typeof body.resourceKeys === 'object') ? body.resourceKeys : {}
  const singleResourceKey = body && typeof body.resourceKey === 'string' ? body.resourceKey : ''
  
  if (fileIds.length === 0) {
    throw new ValidationError('Missing fileId(s)')
  }

  const driveService = new DriveService(c.env)
  
  try {
    const results = await driveService.copyFiles(fileIds, resourceKeyById)
    
    if (Array.isArray(body.fileIds)) {
      return c.json({ items: results })
    }
    return c.json(results[0])
  } catch (e) {
    const msg = String(e && e.message ? e.message : e)
    if (/Drive not connected/i.test(msg)) {
      return c.json({ error: 'Drive not connected. Please connect Google Drive in Admin.' }, 502)
    }
    if (/Failed to refresh token/i.test(msg)) {
      return c.json({ error: 'Drive session expired. Please reconnect Google Drive.' }, 502)
    }
    throw e
  }
}))

export default router

