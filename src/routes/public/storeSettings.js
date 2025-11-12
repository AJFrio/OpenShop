// Public store settings routes
import { Hono } from 'hono'
import { StoreSettingsService } from '../../services/StoreSettingsService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// Get store settings
router.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const settings = await settingsService.getSettings()
  return c.json(settings)
}))

export default router

// Separate router for contact email endpoint
const contactEmailRouter = new Hono()
contactEmailRouter.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const email = await settingsService.getContactEmail()
  return c.json(email)
}))

export { contactEmailRouter }

