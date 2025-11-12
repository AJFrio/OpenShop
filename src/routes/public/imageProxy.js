// Image proxy route for Google Drive links
import { Hono } from 'hono'
import { ALLOWED_DRIVE_HOSTS } from '../../config/index.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

router.get('/', asyncHandler(async (c) => {
  const src = c.req.query('src')
  if (!src) {
    throw new ValidationError('Missing src')
  }

  let targetUrl
  try {
    const u = new URL(src)
    const isAllowed = ALLOWED_DRIVE_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))
    if (!isAllowed) {
      throw new ValidationError('Host not allowed')
    }

    // Normalize Google Drive links to direct download CDN form
    if (u.hostname.endsWith('drive.google.com')) {
      const pathId = u.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      const queryId = u.searchParams.get('id')
      const id = (pathId && pathId[1]) || queryId
      if (!id) {
        throw new ValidationError('Missing Google Drive file id')
      }
      targetUrl = `https://drive.usercontent.google.com/download?id=${id}&export=view`
    } else if (u.hostname.endsWith('drive.usercontent.google.com')) {
      const id = u.searchParams.get('id')
      if (!id) {
        throw new ValidationError('Missing Google Drive file id')
      }
      const newUrl = new URL('https://drive.usercontent.google.com/download')
      newUrl.searchParams.set('id', id)
      newUrl.searchParams.set('export', 'view')
      targetUrl = newUrl.toString()
    } else {
      // Other googleusercontent hosts (e.g., thumbnails) pass-through
      targetUrl = u.toString()
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid src url')
  }

  const upstream = await fetch(targetUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://drive.google.com/',
    },
    cf: { cacheEverything: true },
  })

  if (!upstream.ok) {
    throw new Error(`Upstream error: ${upstream.status}`)
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

  return new Response(upstream.body, { headers })
}))

export default router

