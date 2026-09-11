// Admin AI routes (image generation via OpenRouter).
//
// See ImageGenerationService.
import { Hono } from 'hono'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError, APIError } from '../../utils/errors.js'
import { getKVNamespace } from '../../utils/kv.js'
import { resolveSetting } from '../../services/DeveloperSettingsService.js'
import {
  generateImage,
  ImageGenerationError,
} from '../../services/ImageGenerationService.js'

const router = new Hono()

router.post('/generate-image', asyncHandler(async (c) => {
  const { prompt, inputs } = await c.req.json()

  if (!prompt || typeof prompt !== 'string') {
    throw new ValidationError('Missing prompt')
  }

  const kv = getKVNamespace(c.env)
  const [openRouterApiKey, openRouterModel, siteUrl] = await Promise.all([
    resolveSetting(kv, c.env, 'OPENROUTER_API_KEY'),
    resolveSetting(kv, c.env, 'OPENROUTER_IMAGE_MODEL'),
    resolveSetting(kv, c.env, 'SITE_URL'),
  ])

  try {
    const image = await generateImage({
      openRouterApiKey,
      openRouterModel,
      prompt,
      inputs,
      siteUrl,
    })
    return c.json(image)
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw new APIError(error.message, error.statusCode)
    }
    throw error
  }
}))

export default router
