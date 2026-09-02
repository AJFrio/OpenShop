// Admin AI routes (image generation).
//
// The provider is configurable: Gemini directly, or OpenRouter for access to
// other vendors' models under one key. See ImageGenerationService.
import { Hono } from 'hono'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError, APIError } from '../../utils/errors.js'
import { getKVNamespace } from '../../utils/kv.js'
import { resolveSetting } from '../../services/DeveloperSettingsService.js'
import {
  generateImage,
  ImageGenerationError,
} from '../../services/ImageGenerationService.js'
import { composeMerchRequest } from '../../services/MerchPromptService.js'
import { R2Service } from '../../services/R2Service.js'
import { MediaService } from '../../services/MediaService.js'

const router = new Hono()

router.post('/generate-image', asyncHandler(async (c) => {
  const { prompt, inputs } = await c.req.json()

  if (!prompt || typeof prompt !== 'string') {
    throw new ValidationError('Missing prompt')
  }

  const kv = getKVNamespace(c.env)
  const [provider, geminiApiKey, openRouterApiKey, geminiModel, openRouterModel, siteUrl] =
    await Promise.all([
      resolveSetting(kv, c.env, 'IMAGE_PROVIDER'),
      resolveSetting(kv, c.env, 'GEMINI_API_KEY'),
      resolveSetting(kv, c.env, 'OPENROUTER_API_KEY'),
      resolveSetting(kv, c.env, 'GEMINI_IMAGE_MODEL'),
      resolveSetting(kv, c.env, 'OPENROUTER_IMAGE_MODEL'),
      resolveSetting(kv, c.env, 'SITE_URL'),
    ])

  try {
    const image = await generateImage({
      provider,
      geminiApiKey,
      openRouterApiKey,
      geminiModel,
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

/**
 * Generate a merchandise mockup from labelled fields, store it, and return a
 * URL that can go straight onto a product.
 *
 * Separate from /generate-image because that one returns raw base64 for the
 * media picker to preview. Here the caller — the agent, usually — needs a
 * persisted URL, and making it round-trip base64 through the model's context
 * would be both slow and expensive.
 */
router.post('/generate-merch-image', asyncHandler(async (c) => {
  const body = await c.req.json()
  const { description, model, pose, product, logo, references } = body || {}

  if (!description && !product) {
    throw new ValidationError('Describe the product, or name it in the product field')
  }

  const { prompt, inputs } = composeMerchRequest(
    { description, model, pose, product, logo },
    references || {},
  )

  const kv = getKVNamespace(c.env)
  const [provider, geminiApiKey, openRouterApiKey, geminiModel, openRouterModel, siteUrl] =
    await Promise.all([
      resolveSetting(kv, c.env, 'IMAGE_PROVIDER'),
      resolveSetting(kv, c.env, 'GEMINI_API_KEY'),
      resolveSetting(kv, c.env, 'OPENROUTER_API_KEY'),
      resolveSetting(kv, c.env, 'GEMINI_IMAGE_MODEL'),
      resolveSetting(kv, c.env, 'OPENROUTER_IMAGE_MODEL'),
      resolveSetting(kv, c.env, 'SITE_URL'),
    ])

  let image
  try {
    image = await generateImage({
      provider,
      geminiApiKey,
      openRouterApiKey,
      geminiModel,
      openRouterModel,
      prompt,
      inputs,
      siteUrl,
    })
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw new APIError(error.message, error.statusCode)
    }
    throw error
  }

  // Persist it. A generated image that only exists in a response body cannot
  // be attached to a product.
  const r2 = new R2Service(c.env)
  let stored
  try {
    stored = await r2.uploadFile(image.mimeType, image.dataBase64, 'merch-mockup.png')
  } catch (error) {
    // Worth naming precisely: the image generated fine, and only storage
    // failed. Without this the caller sees a generic 500 and retries the
    // expensive part.
    throw new APIError(
      `Image generated, but could not be saved: ${error?.message ?? error}. Check the R2 bucket binding.`,
      503,
    )
  }

  const url = stored.viewUrl || stored.downloadUrl
  await new MediaService(kv).createMediaItem({
    url,
    source: 'storage',
    filename: 'merch-mockup',
    mimeType: image.mimeType,
  }).catch((error) => {
    // A missing media-library entry is cosmetic; the URL still works.
    console.error('Generated image was stored but not added to the media library:', error)
  })

  return c.json({ url, mimeType: image.mimeType, prompt })
}))

export default router
