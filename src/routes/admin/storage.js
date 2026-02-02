import { Hono } from 'hono'
import { R2Service } from '../../services/R2Service.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// Upload file to storage (R2)
router.post('/upload', asyncHandler(async (c) => {
  const { mimeType, dataBase64, filename } = await c.req.json()

  if (!mimeType || !dataBase64) {
    throw new ValidationError('Missing mimeType or dataBase64')
  }

  const r2Service = new R2Service(c.env)

  const result = await r2Service.uploadFile(mimeType, dataBase64, filename || 'image')
  return c.json(result)
}))

export default router
