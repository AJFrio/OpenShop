import { Hono } from 'hono'
import { PageContentService } from '../../services/PageContentService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

router.get('/:slug', asyncHandler(async (c) => {
  const slug = c.req.param('slug')
  const kvNamespace = getKVNamespace(c.env)
  const service = new PageContentService(kvNamespace)

  try {
    const page = await service.getPage(slug)
    return c.json(page)
  } catch (error) {
    throw new ValidationError(error.message)
  }
}))

export default router
