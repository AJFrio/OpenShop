// Admin authentication routes
import { Hono } from 'hono'
import { generateSessionToken, hashToken, timingSafeEqualStrings } from '../../utils/crypto.js'
import { getKVNamespace } from '../../utils/kv.js'
import { ADMIN_TOKEN_TTL, KV_KEYS } from '../../config/index.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError, AuthenticationError } from '../../utils/errors.js'
import { DeveloperSettingsService, hashPassword } from '../../services/DeveloperSettingsService.js'

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

  // A password set in Developer Settings wins; otherwise fall back to the
  // ADMIN_PASSWORD binding. KV holds only a salted hash, never the plaintext.
  //
  // If a UI-set password is ever lost, deleting the KV entry restores the
  // binding:
  //   wrangler kv key delete developer:settings --namespace-id <id> --remote
  const devSettings = new DeveloperSettingsService(kvNamespace)
  const stored = await devSettings.getRaw()

  let isValid
  if (stored.ADMIN_PASSWORD_HASH && stored.ADMIN_PASSWORD_SALT) {
    const { hash } = await hashPassword(password, stored.ADMIN_PASSWORD_SALT)
    isValid = await timingSafeEqualStrings(hash, stored.ADMIN_PASSWORD_HASH)
  } else {
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'
    isValid = await timingSafeEqualStrings(password, adminPassword)
  }
  
  if (!isValid) {
    // Increment rate limit counter
    await kvNamespace.put(rateLimitKey, (attemptCount + 1).toString(), {
      expirationTtl: 900 // 15 minutes
    })
    throw new AuthenticationError('Invalid password')
  }
  
  // Clear rate limit on successful login
  await kvNamespace.delete(rateLimitKey)

  // Clean up legacy KV password hash from older deploys
  await kvNamespace.delete(`${KV_KEYS.ADMIN_TOKEN_PREFIX}password_hash`)

  const token = generateSessionToken()
  const hashedToken = await hashToken(token)

  await kvNamespace.put(`${KV_KEYS.ADMIN_TOKEN_PREFIX}${hashedToken}`, Date.now().toString(), {
    expirationTtl: ADMIN_TOKEN_TTL // 24 hours
  })

  return c.json({ token })
}))

export default router
