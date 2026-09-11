// Admin developer-settings routes.
//
// Lets a store owner configure API keys and runtime options without a
// terminal. Values are stored in KV and take precedence over the equivalent
// Worker bindings — see DeveloperSettingsService for why a Worker cannot
// write its own secrets.
import { Hono } from 'hono'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'
import { timingSafeEqualStrings } from '../../utils/crypto.js'
import {
  DeveloperSettingsService,
  hashPassword,
} from '../../services/DeveloperSettingsService.js'

const router = new Hono()

// Current settings. Secret values are never returned — only whether each is
// set, and whether it came from settings or the environment.
router.get('/', asyncHandler(async (c) => {
  const service = new DeveloperSettingsService(getKVNamespace(c.env))
  return c.json({ fields: await service.getPublicView(c.env) })
}))

// Update non-password settings. An empty string clears an override.
router.put('/', asyncHandler(async (c) => {
  const updates = await c.req.json()
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new ValidationError('Expected an object of settings')
  }
  if ('ADMIN_PASSWORD' in updates) {
    throw new ValidationError('Use /password to change the admin password')
  }

  const service = new DeveloperSettingsService(getKVNamespace(c.env))
  await service.update(updates)
  return c.json({ fields: await service.getPublicView(c.env) })
}))

// Change the admin password.
//
// Requires the current password even though the caller already holds a valid
// admin token: a token left open on a shared machine should not be enough to
// take the store over.
router.put('/password', asyncHandler(async (c) => {
  const { currentPassword, newPassword } = await c.req.json()

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters')
  }
  if (!currentPassword || typeof currentPassword !== 'string') {
    throw new ValidationError('Current password is required')
  }

  const kvNamespace = getKVNamespace(c.env)
  const service = new DeveloperSettingsService(kvNamespace)
  const stored = await service.getRaw()

  let currentValid
  if (stored.ADMIN_PASSWORD_HASH && stored.ADMIN_PASSWORD_SALT) {
    const { hash } = await hashPassword(currentPassword, stored.ADMIN_PASSWORD_SALT)
    currentValid = await timingSafeEqualStrings(hash, stored.ADMIN_PASSWORD_HASH)
  } else {
    currentValid = await timingSafeEqualStrings(
      currentPassword,
      c.env.ADMIN_PASSWORD || 'admin123',
    )
  }

  if (!currentValid) {
    throw new ValidationError('Current password is incorrect')
  }

  await service.setAdminPassword(newPassword)
  return c.json({ ok: true })
}))

// Drop a UI-set password, falling back to the ADMIN_PASSWORD binding.
router.delete('/password', asyncHandler(async (c) => {
  const service = new DeveloperSettingsService(getKVNamespace(c.env))
  await service.clearAdminPassword()
  return c.json({ ok: true })
}))

export default router
