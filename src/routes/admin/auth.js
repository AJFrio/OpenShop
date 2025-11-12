// Admin authentication routes
import { Hono } from 'hono'
import { generateSessionToken } from '../../utils/crypto.js'
import { hashToken, verifyPassword, hashPasswordWithSalt } from '../../utils/crypto.js'
import { getKVNamespace } from '../../utils/kv.js'
import { ADMIN_TOKEN_TTL, KV_KEYS } from '../../config/index.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError, AuthenticationError } from '../../utils/errors.js'

const router = new Hono()

// Admin login with rate limiting protection
router.post('/login', asyncHandler(async (c) => {
  const { password } = await c.req.json()
  
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required')
  }

  const kvNamespace = getKVNamespace(c.env)
  const clientIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const rateLimitKey = `rate_limit:login:${clientIp}`
  
  // Simple rate limiting: 5 attempts per 15 minutes
  const attempts = await kvNamespace.get(rateLimitKey)
  const attemptCount = attempts ? parseInt(attempts, 10) : 0
  
  if (attemptCount >= 5) {
    throw new AuthenticationError('Too many login attempts. Please try again later.')
  }

  // Get stored password hash or use default (will be hashed on first use)
  const storedHashKey = `${KV_KEYS.ADMIN_TOKEN_PREFIX}password_hash`
  let storedHash = await kvNamespace.get(storedHashKey)
  
  const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
  
  // If no hash stored, create one from the current password
  if (!storedHash) {
    storedHash = await hashPasswordWithSalt(adminPassword)
    await kvNamespace.put(storedHashKey, storedHash)
  }
  
  // Verify password
  const isValid = await verifyPassword(password, storedHash)
  
  if (!isValid) {
    // Increment rate limit counter
    await kvNamespace.put(rateLimitKey, (attemptCount + 1).toString(), {
      expirationTtl: 900 // 15 minutes
    })
    throw new AuthenticationError('Invalid password')
  }
  
  // Clear rate limit on successful login
  await kvNamespace.delete(rateLimitKey)

  const token = generateSessionToken()
  const hashedToken = await hashToken(token)

  await kvNamespace.put(`${KV_KEYS.ADMIN_TOKEN_PREFIX}${hashedToken}`, Date.now().toString(), {
    expirationTtl: ADMIN_TOKEN_TTL // 24 hours
  })

  return c.json({ token })
}))

export default router

