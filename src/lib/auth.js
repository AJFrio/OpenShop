// Simple admin authentication system
// In production, you should use a more robust authentication system

const ADMIN_TOKEN_KEY = 'openshop_admin_token'

// Generate a simple session token (in production, use proper JWT or session management)
export function generateAdminToken() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID().replace(/-/g, '')
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(32)
    cryptoObj.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  throw new Error('Secure random number generator is not available')
}

// Store admin token in localStorage
export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  try {
    window.dispatchEvent(new CustomEvent('openshop-admin-login'))
  } catch {}
}

// Get admin token from localStorage
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

// Remove admin token
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  try {
    window.dispatchEvent(new CustomEvent('openshop-admin-logout'))
  } catch {}
}

// Check if user is authenticated as admin
/** Whether the store is still on the default password and must change it. */
export function mustChangePassword() {
  try {
    return sessionStorage.getItem('openshop:must-change-password') === '1'
  } catch {
    return false
  }
}

/** Clear the forced-change flag once a new password has been set. */
export function clearMustChangePassword() {
  try {
    sessionStorage.removeItem('openshop:must-change-password')
  } catch {
    // sessionStorage can be unavailable; the banner simply persists.
  }
}

export function isAdminAuthenticated() {
  const token = getAdminToken()
  return token !== null && token.length > 0
}

// Admin API request helper with authentication
export async function adminApiRequest(url, options = {}) {
  const token = getAdminToken()
  
  if (!token) {
    clearAdminToken()
    throw new Error('Admin authentication required')
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Token': token,
    ...options.headers
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401) {
    clearAdminToken()
    throw new Error('Admin session expired. Please log in again.')
  }

  if (response.status === 502) {
    // Google Drive related errors - don't clear admin token
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Service temporarily unavailable')
  }

  return response
}

/**
 * Admin login against Worker ADMIN_PASSWORD.
 * @param {string} password
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function adminLogin(password) {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })

    if (response.ok) {
      const { token, mustChangePassword: needsChange } = await response.json()
      setAdminToken(token)
      // Remembered for the session so the panel can insist on a change while
      // the store is still on the published default password.
      if (needsChange) {
        sessionStorage.setItem('openshop:must-change-password', '1')
      } else {
        sessionStorage.removeItem('openshop:must-change-password')
      }
      return { ok: true, mustChangePassword: Boolean(needsChange) }
    }

    const errorData = await response.json().catch(() => ({}))
    return {
      ok: false,
      error: errorData.error || 'Invalid password. Please try again.',
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return { ok: false, error: 'Login failed. Please try again.' }
  }
}
