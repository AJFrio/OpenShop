// Public storefront routes (theme, settings)
import { Hono } from 'hono'
import { ThemeService } from '../../services/ThemeService.js'
import { StoreSettingsService } from '../../services/StoreSettingsService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'

const router = new Hono()

// Get storefront theme
router.get('/theme', asyncHandler(async (c) => {
  const themeService = new ThemeService(c.env)
  const theme = await themeService.getTheme()
  return c.json(theme)
}))

export default router

