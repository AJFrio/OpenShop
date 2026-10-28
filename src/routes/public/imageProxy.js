// Image proxy route for Google Drive links
import { Hono } from 'hono'
import { ALLOWED_DRIVE_HOSTS, ALLOWED_PROXY_IMAGE_TYPES, IMAGE_PROXY_CSP } from '../../config/index.js'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { APIError, ValidationError } from '../../utils/errors.js'

const router = new Hono()

const ALLOWED_TYPE_SET = new Set(ALLOWED_PROXY_IMAGE_TYPES)

function normalizeImageMime(contentType) {
  if (!contentType || typeof contentType !== 'string') return null
  const mediaType = contentType.split(';')[0].trim().toLowerCase()
  if (mediaType === 'image/jpg') return 'image/jpeg'
  if (ALLOWED_TYPE_SET.has(mediaType)) return mediaType
  return null
}

function proxySecurityHeaders(contentType) {
  const headers = new Headers()
  if (contentType) headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Security-Policy', IMAGE_PROXY_CSP)
  return headers
}

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
      'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://drive.google.com/',
    },
    cf: { cacheEverything: true },
  })

  if (!upstream.ok) {
    throw new APIError(`Upstream error: ${upstream.status}`, 502)
  }

  const allowedType = normalizeImageMime(upstream.headers.get('content-type'))
  if (!allowedType) {
    // Do not forward HTML login pages, SVG, or scripts from the OpenShop origin
    throw new APIError('Upstream response is not a supported image type', 415)
  }

  return new Response(upstream.body, { headers: proxySecurityHeaders(allowedType) })
}))

export default router
