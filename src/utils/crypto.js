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
 * Hashes a password using PBKDF2 (for password verification)
 * Note: In production, consider using a more secure method like Argon2
 * @param {string} password - Password to hash
 * @param {string} salt - Salt (hex string)
 * @param {number} iterations - Number of iterations (default: 100000)
 * @returns {Promise<string>} - Hashed password (hex string)
 */
export async function hashPassword(password, salt, iterations = 100000) {
  const cryptoObj = getCrypto()
  if (!cryptoObj.subtle) {
    throw new Error('Web Crypto API is not available for password hashing')
  }

  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)
  
  // Convert salt from hex to Uint8Array
  const saltBytes = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  
  // Import password as key
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  
  // Derive key using PBKDF2
  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  )
  
  // Convert to hex string
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verifies a password against a hash
 * @param {string} password - Password to verify
 * @param {string} hash - Stored hash (format: iterations:salt:hash)
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  try {
    const [iterationsStr, salt, expectedHash] = hash.split(':')
    const iterations = parseInt(iterationsStr, 10)
    
    if (!iterations || !salt || !expectedHash) {
      return false
    }
    
    const computedHash = await hashPassword(password, salt, iterations)
    return computedHash === expectedHash
  } catch (error) {
    return false
  }
}

/**
 * Generates a random salt for password hashing
 * @param {number} bytes - Number of bytes (default: 16)
 * @returns {string} - Salt as hex string
 */
export function generateSalt(bytes = 16) {
  return randomHex(bytes)
}

/**
 * Hashes a password with a new salt
 * @param {string} password - Password to hash
 * @param {number} iterations - Number of iterations (default: 100000)
 * @returns {Promise<string>} - Hash in format: iterations:salt:hash
 */
export async function hashPasswordWithSalt(password, iterations = 100000) {
  const salt = generateSalt(16)
  const hash = await hashPassword(password, salt, iterations)
  return `${iterations}:${salt}:${hash}`
}

