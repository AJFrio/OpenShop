// Request parsing helpers used at the HTTP boundary
import { ValidationError } from './errors.js'

const MAX_IP_LENGTH = 64

/**
 * Parse a JSON request body into an object.
 * Malformed JSON becomes a 400 ValidationError instead of a 500.
 * @param {import('hono').Context} c
 * @returns {Promise<Record<string, unknown>>}
 */
export async function parseJsonBody(c) {
  let body
  try {
    body = await c.req.json()
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError('Invalid JSON body')
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object')
  }

  return body
}

/**
 * Client IP for rate limiting.
 * Prefers CF-Connecting-IP; X-Forwarded-For falls back to the first hop only.
 * @param {import('hono').Context} c
 * @returns {string}
 */
export function getClientIp(c) {
  const cfIp = sanitizeIpCandidate(c.req.header('CF-Connecting-IP'))
  if (cfIp) return cfIp

  const forwarded = c.req.header('X-Forwarded-For')
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstHop = sanitizeIpCandidate(forwarded.split(',')[0])
    if (firstHop) return firstHop
  }

  return 'unknown'
}

function sanitizeIpCandidate(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim().slice(0, MAX_IP_LENGTH)
  if (!trimmed) return ''
  // Keep hostname / IP characters only so headers cannot pollute KV keys.
  return trimmed.replace(/[^0-9a-zA-Z.:_-]/g, '').slice(0, MAX_IP_LENGTH)
}
