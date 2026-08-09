// Cryptographic utilities

/**
 * Gets the Web Crypto API
 * @returns {Crypto}
 * @throws {Error} If crypto is not available
 */
export function getCrypto() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null
  if (!cryptoObj) {
    throw new Error('Web Crypto API is not available in this environment')
  }
  return cryptoObj
}

/**
 * Generates random hex string
 * @param {number} bytes - Number of bytes (default: 16)
 * @returns {string} - Hex string
 */
export function randomHex(bytes = 16) {
  const cryptoObj = getCrypto()
  if (typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available')
  }
  const buffer = new Uint8Array(bytes)
  cryptoObj.getRandomValues(buffer)
  return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a session token
 * @returns {string} - Session token
 */
export function generateSessionToken() {
  const cryptoObj = getCrypto()
  if (typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID().replace(/-/g, '')
  }
  return randomHex(32)
}

/**
 * Hashes a token using SHA-256
 * @param {string} token - Token to hash
 * @returns {Promise<string>} - Hashed token (hex string)
 */
export async function hashToken(token) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Token must be a non-empty string for hashing')
  }

  const cryptoObj = getCrypto()
  if (!cryptoObj.subtle || typeof cryptoObj.subtle.digest !== 'function') {
    throw new Error('Web Crypto API is not available for hashing tokens')
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const digest = await cryptoObj.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Timing-safe string comparison via SHA-256 digests.
 * Avoids leaking password length/content through early exits on raw bytes.
 * @param {string} a
 * @param {string} b
 * @returns {Promise<boolean>}
 */
export async function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }

  const cryptoObj = getCrypto()
  if (!cryptoObj.subtle || typeof cryptoObj.subtle.digest !== 'function') {
    throw new Error('Web Crypto API is not available for secure comparison')
  }

  const encoder = new TextEncoder()
  const [digestA, digestB] = await Promise.all([
    cryptoObj.subtle.digest('SHA-256', encoder.encode(a)),
    cryptoObj.subtle.digest('SHA-256', encoder.encode(b)),
  ])

  const bytesA = new Uint8Array(digestA)
  const bytesB = new Uint8Array(digestB)
  if (bytesA.length !== bytesB.length) {
    return false
  }

  let diff = 0
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i]
  }
  return diff === 0
}

