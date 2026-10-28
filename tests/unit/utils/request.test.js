import { describe, it, expect } from 'vitest'
import { getClientIp, parseJsonBody } from '../../../src/utils/request.js'
import { ValidationError } from '../../../src/utils/errors.js'

function contextWithHeaders(headers, jsonImpl) {
  return {
    req: {
      header: (name) => headers[name] || headers[name.toLowerCase()] || undefined,
      json: jsonImpl,
    },
  }
}

describe('getClientIp', () => {
  it('prefers CF-Connecting-IP', () => {
    const c = contextWithHeaders({
      'CF-Connecting-IP': '192.0.2.10',
      'X-Forwarded-For': '198.51.100.1, 10.0.0.1',
    })
    expect(getClientIp(c)).toBe('192.0.2.10')
  })

  it('uses the first X-Forwarded-For hop', () => {
    const c = contextWithHeaders({
      'X-Forwarded-For': '  203.0.113.5, 10.0.0.2, spoofed  ',
    })
    expect(getClientIp(c)).toBe('203.0.113.5')
  })

  it('strips path separators from spoofed headers', () => {
    const c = contextWithHeaders({
      'X-Forwarded-For': 'evil.com/../../rate_limit, 1.2.3.4',
    })
    const ip = getClientIp(c)
    expect(ip).not.toContain('/')
    expect(ip.length).toBeLessThanOrEqual(64)
  })

  it('bounds overly long values', () => {
    const c = contextWithHeaders({
      'CF-Connecting-IP': `${'1'.repeat(80)}.2.3.4`,
    })
    expect(getClientIp(c).length).toBeLessThanOrEqual(64)
  })
})

describe('parseJsonBody', () => {
  it('returns parsed objects', async () => {
    const c = contextWithHeaders({}, async () => ({ password: 'x' }))
    await expect(parseJsonBody(c)).resolves.toEqual({ password: 'x' })
  })

  it('throws ValidationError for malformed JSON', async () => {
    const c = contextWithHeaders({}, async () => {
      throw new SyntaxError('Unexpected token')
    })
    await expect(parseJsonBody(c)).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects arrays and primitives', async () => {
    const c = contextWithHeaders({}, async () => ['nope'])
    await expect(parseJsonBody(c)).rejects.toBeInstanceOf(ValidationError)
  })
})
