// Admin media routes
import { Hono } from 'hono'
import { MediaService } from '../../services/MediaService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// List media items
router.get('/', asyncHandler(async (c) => {
  const kvNamespace = getKVNamespace(c.env)
  const mediaService = new MediaService(kvNamespace)
  const items = await mediaService.getAllMediaItems()
  return c.json(items)
}))

// Create media item
router.post('/', asyncHandler(async (c) => {
  const body = await c.req.json()
  const url = body?.url
  
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new ValidationError('url is required')
  }

  const kvNamespace = getKVNamespace(c.env)
  const mediaService = new MediaService(kvNamespace)
  const saved = await mediaService.createMediaItem(body)
  return c.json(saved, 201)
}))

// Delete media item
router.delete('/:id', asyncHandler(async (c) => {
  const id = c.req.param('id')
  if (!id) {
    throw new ValidationError('Missing id')
  }
  
  const kvNamespace = getKVNamespace(c.env)
  const mediaService = new MediaService(kvNamespace)
  await mediaService.deleteMediaItem(id)
  return c.json({ success: true })
}))

export default router

