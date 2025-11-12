// Google Drive service - handles Drive operations
import { getKVNamespace } from '../utils/kv.js'
import { generateSessionToken } from '../utils/crypto.js'
import { KV_KEYS } from '../config/index.js'

const DRIVE_TOKEN_KEY = KV_KEYS.DRIVE_TOKEN
const DRIVE_FOLDER_KV_PREFIX = KV_KEYS.DRIVE_FOLDER_PREFIX

export class DriveService {
  constructor(env) {
    this.env = env
    this.kv = getKVNamespace(env)
  }

  /**
   * Get Drive connection status
   */
  async getConnectionStatus() {
    try {
      const raw = await this.kv.get(DRIVE_TOKEN_KEY)
      if (!raw) return { connected: false }
      const t = JSON.parse(raw)
      return { connected: !!t?.access_token }
    } catch (_) {
      return { connected: false }
    }
  }

  /**
   * Disconnect Drive
   */
  async disconnect() {
    if (!this.kv) {
      throw new Error('KV namespace not available')
    }

    // Clear the drive tokens
    await this.kv.delete(DRIVE_TOKEN_KEY)

    // Clear any cached folder IDs
    const keys = await this.kv.list({ prefix: DRIVE_FOLDER_KV_PREFIX })
    for (const key of keys.keys) {
      await this.kv.delete(key.name)
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureAccessToken() {
    const raw = await this.kv.get(DRIVE_TOKEN_KEY)
    if (!raw) throw new Error('Drive not connected')
    let tok = JSON.parse(raw)
    const now = Math.floor(Date.now() / 1000)
    if (tok.expiry && tok.expiry > now + 60) return tok
    if (!tok.refresh_token) return tok

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.env.GOOGLE_CLIENT_ID,
        client_secret: this.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tok.refresh_token,
        grant_type: 'refresh_token'
      })
    })

    if (!tokenRes.ok) {
      let errText = ''
      try { errText = await tokenRes.text() } catch (_) {}
      console.error('Drive token refresh failed', tokenRes.status, errText)
      
      // If the refresh token is invalid, clear it so UI can re-connect
      if (errText && /invalid_grant/i.test(errText)) {
        try {
          const cleared = { ...tok, access_token: '', refresh_token: null, expiry: 0 }
          await this.kv.put(DRIVE_TOKEN_KEY, JSON.stringify(cleared))
        } catch (_) {}
      }
      throw new Error('Failed to refresh token')
    }

    const t = await tokenRes.json()
    tok.access_token = t.access_token
    tok.expiry = Math.floor(Date.now() / 1000) + (t.expires_in || 3600) - 30
    await this.kv.put(DRIVE_TOKEN_KEY, JSON.stringify(tok))
    return tok
  }

  /**
   * Ensure root folder exists
   */
  async ensureRootFolder(tok) {
    const desiredName = (this.env.DRIVE_ROOT_FOLDER && String(this.env.DRIVE_ROOT_FOLDER).trim()) || this.deriveDefaultFolderName()
    const kvKey = `${DRIVE_FOLDER_KV_PREFIX}:${desiredName}:id`
    const existing = await this.kv.get(kvKey)
    if (existing) return { id: existing, name: desiredName }

    // Look up folder by name at My Drive root
    const query = `mimeType='application/vnd.google-apps.folder' and name='${desiredName.replace(/'/g, "\\'")}' and 'root' in parents and trashed=false`
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
    const foundRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${tok.access_token}` }
    })

    if (foundRes.ok) {
      const j = await foundRes.json()
      if (Array.isArray(j.files) && j.files.length > 0) {
        const id = j.files[0].id
        await this.kv.put(kvKey, id)
        return { id, name: desiredName }
      }
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tok.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: desiredName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    })

    if (!createRes.ok) {
      const t = await createRes.text()
      console.error('Failed to create Drive folder', t)
      throw new Error('Failed to create Drive folder')
    }

    const created = await createRes.json()
    const folderId = created.id
    await this.kv.put(kvKey, folderId)
    return { id: folderId, name: desiredName }
  }

  /**
   * Derive default folder name from site URL
   */
  deriveDefaultFolderName() {
    try {
      if (this.env.SITE_URL) {
        const u = new URL(this.env.SITE_URL)
        const sub = u.hostname.split('.')[0] || 'openshop'
        return sub.replace(/[-_]+/g, ' ').trim()
      }
    } catch (_) {}
    return 'OpenShop'
  }

  /**
   * Upload file to Drive
   */
  async uploadFile(mimeType, dataBase64, filename) {
    const tok = await this.ensureAccessToken()
    const folder = await this.ensureRootFolder(tok)
    const boundary = `openshop-${generateSessionToken()}`
    const metadata = { name: filename || 'openshop-image', parents: [folder.id] }
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${dataBase64}\r\n` +
      `--${boundary}--`

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tok.access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    })

    if (!uploadRes.ok) {
      const t = await uploadRes.text()
      console.error('Drive upload failed', t)
      throw new Error(`Drive upload failed: ${t}`)
    }

    const file = await uploadRes.json()
    const fileId = file.id

    // Make public readable
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tok.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    }).catch(() => {})

    const viewUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=view`
    return { id: fileId, viewUrl, webViewLink: file.webViewLink, downloadUrl: viewUrl, folder: { id: folder.id, name: folder.name } }
  }

  /**
   * Get picker configuration
   */
  async getPickerConfig() {
    const apiKey = this.env.GOOGLE_API_KEY
    const clientId = this.env.GOOGLE_CLIENT_ID
    if (!apiKey || !clientId) {
      throw new Error('Picker not configured')
    }
    const tok = await this.ensureAccessToken()
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = Math.max(0, (tok.expiry || now) - now)
    return { apiKey, clientId, accessToken: tok.access_token, expiresIn }
  }

  /**
   * Copy files to Drive folder
   */
  async copyFiles(fileIds, resourceKeys = {}) {
    const tok = await this.ensureAccessToken()
    const folder = await this.ensureRootFolder(tok)
    const results = []

    for (const srcId of fileIds) {
      const rk = resourceKeys[srcId] || ''
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(srcId)}?fields=id,mimeType,shortcutDetails,targetId,resourceKey,webViewLink,driveId&supportsAllDrives=true${rk ? `&resourceKey=${encodeURIComponent(rk)}` : ''}`
      const metaRes = await fetch(metaUrl, { headers: { 'Authorization': `Bearer ${tok.access_token}` } })
      
      if (!metaRes.ok) {
        const t = await metaRes.text().catch(() => '')
        console.error('Drive get file failed', srcId, t)
        throw new Error(`Drive file lookup failed: ${t}`)
      }

      const meta = await metaRes.json()
      let effectiveId = meta && meta.mimeType === 'application/vnd.google-apps.shortcut' && meta.shortcutDetails && meta.shortcutDetails.targetId
        ? meta.shortcutDetails.targetId
        : (meta && meta.id ? meta.id : srcId)
      const effectiveResourceKey = meta && meta.resourceKey ? meta.resourceKey : rk

      // Copy the source file into our folder
      const copyEndpoint = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(effectiveId)}/copy?supportsAllDrives=true${effectiveResourceKey ? `&resourceKey=${encodeURIComponent(effectiveResourceKey)}` : ''}`
      const copyRes = await fetch(copyEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tok.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parents: [folder.id] })
      })

      if (!copyRes.ok) {
        const t = await copyRes.text().catch(() => '')
        console.error('Drive copy failed', effectiveId, t)
        throw new Error(`Drive copy failed: ${t}`)
      }

      const copied = await copyRes.json()
      const fileId = copied.id

      // Make public readable (best effort)
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tok.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      }).catch(() => {})

      const viewUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=view`
      results.push({ id: fileId, viewUrl, webViewLink: copied.webViewLink, downloadUrl: viewUrl, folder: { id: folder.id, name: folder.name } })
    }

    return results
  }
}

