// Admin settings routes
import { Hono } from 'hono'
import { ThemeService } from '../../services/ThemeService.js'
import { StoreSettingsService } from '../../services/StoreSettingsService.js'
import { StorefrontPageService } from '../../services/StorefrontPageService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { validateThemePayload } from '../../middleware/validation.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// Get storefront theme
router.get('/storefront/theme', asyncHandler(async (c) => {
  const themeService = new ThemeService(c.env)
  const theme = await themeService.getTheme()
  return c.json(theme)
}))

// Update storefront theme
router.put('/storefront/theme', asyncHandler(async (c) => {
  const payload = await c.req.json()
  const validation = validateThemePayload(payload)
  
  if (!validation.valid) {
    throw new ValidationError(validation.message)
  }

  const themeService = new ThemeService(c.env)
  const theme = await themeService.updateTheme(payload)
  return c.json(theme)
}))

// Reset storefront theme
router.delete('/storefront/theme', asyncHandler(async (c) => {
  const themeService = new ThemeService(c.env)
  const theme = await themeService.resetTheme()
  return c.json(theme)
}))

// Get store settings
router.get('/store-settings', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const settings = await settingsService.getSettings()
  
  // If productLimit is not in store settings, check environment variable
  if ((settings.productLimit === null || settings.productLimit === undefined || settings.productLimit === '') && c.env.PRODUCT_LIMIT) {
    settings.productLimit = c.env.PRODUCT_LIMIT
  }
  
  return c.json(settings)
}))

// Update store settings
router.put('/store-settings', asyncHandler(async (c) => {
  const settings = await c.req.json()
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const updatedSettings = await settingsService.updateSettings(settings)
  return c.json(updatedSettings)
}))

router.get('/storefront/pages/:pageId', asyncHandler(async (c) => {
  const pageId = c.req.param('pageId')
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const pageService = new StorefrontPageService(kvNamespace)
  const settings = await settingsService.getSettings()
  const page = await pageService.getPage(pageId, settings)
  return c.json(page)
}))

router.put('/storefront/pages/:pageId', asyncHandler(async (c) => {
  const pageId = c.req.param('pageId')
  const data = await c.req.json()
  const kvNamespace = getKVNamespace(c.env)
  const pageService = new StorefrontPageService(kvNamespace)
  const page = await pageService.updatePage(pageId, data)
  return c.json(page)
}))

router.delete('/storefront/pages/:pageId', asyncHandler(async (c) => {
  const pageId = c.req.param('pageId')
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const pageService = new StorefrontPageService(kvNamespace)
  const settings = await settingsService.getSettings()
  const page = await pageService.resetPage(pageId, settings)
  return c.json(page)
}))

export default router

