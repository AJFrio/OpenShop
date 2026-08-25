import { Hono } from 'hono'
import { PageContentService } from '../../services/PageContentService.js'
import { getKVNamespace } from '../../utils/kv.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'
import { isValidPageSlug } from '../../lib/pageContent.js'

const router = new Hono()

router.get('/:slug', asyncHandler(async (c) => {
  const slug = c.req.param('slug')
  if (!isValidPageSlug(slug)) {
    throw new ValidationError(`Invalid page slug: ${slug}`)
  }

  const kvNamespace = getKVNamespace(c.env)
  const service = new PageContentService(kvNamespace)

  const page = await service.getPage(slug)
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(page)
}))

export default router
