// Public storefront routes (theme, settings)
import { Hono } from 'hono'
import { ThemeService } from '../../services/ThemeService.js'
import { StoreSettingsService } from '../../services/StoreSettingsService.js'
import { StorefrontPageService } from '../../services/StorefrontPageService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// Get storefront theme
router.get('/theme', asyncHandler(async (c) => {
  const themeService = new ThemeService(c.env)
  const theme = await themeService.getTheme()
  return c.json(theme)
}))

router.get('/pages/:pageId', asyncHandler(async (c) => {
  const pageId = c.req.param('pageId')
  const kvNamespace = getKVNamespace(c.env)
  const settingsService = new StoreSettingsService(kvNamespace)
  const pageService = new StorefrontPageService(kvNamespace)
  const settings = await settingsService.getSettings()
  const page = await pageService.getPage(pageId, settings)
  return c.json(page)
}))

export default router

