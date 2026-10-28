import { Hono } from 'hono'
import { R2Service } from '../../services/R2Service.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { assertSafeResourceId } from '../../utils/validation.js'

const router = new Hono()

router.get('/:key', asyncHandler(async (c) => {
  const key = assertSafeResourceId(c.req.param('key'), 'image key')
  const r2Service = new R2Service(c.env)

  try {
    const object = await r2Service.getFile(key)
    if (!object) {
      return c.notFound()
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    // Set cache control for performance
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new Response(object.body, {
      headers,
    })
  } catch (e) {
    console.error('Error fetching image:', e)
    return c.notFound()
  }
}))

export default router
