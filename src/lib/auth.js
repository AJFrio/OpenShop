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
  } catch (_) {}
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
  } catch (_) {}
}

// Check if user is authenticated as admin
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

  return response
}

// Simple admin login (in production, implement proper password authentication)
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
      const { token } = await response.json()
      setAdminToken(token)
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return false
  }
}
