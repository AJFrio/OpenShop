// Validation middleware
import { ValidationError } from '../utils/errors.js'
import { THEME_COLOR_KEYS, THEME_RADIUS_MULTIPLIER_MIN, THEME_RADIUS_MULTIPLIER_MAX } from '../config/index.js'
import { FONT_OPTIONS, HEX_COLOR_REGEX } from '../lib/theme.js'
import { isValidHexColor, isNumberInRange, isValidObject } from '../utils/validation.js'

const ALLOWED_FONT_IDS = new Set(FONT_OPTIONS.map((font) => font.id))

/**
 * Validates theme payload
 * @param {any} payload - Theme payload to validate
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateThemePayload(payload) {
  if (!isValidObject(payload)) {
    return { valid: false, message: 'Invalid theme payload' }
  }

  const colors = payload.colors
  if (!isValidObject(colors)) {
    return { valid: false, message: 'Missing colors object' }
  }

  // Validate all required color keys
  for (const key of THEME_COLOR_KEYS) {
    const value = typeof colors[key] === 'string' ? colors[key].trim() : ''
    if (!isValidHexColor(value)) {
      return { valid: false, message: `Invalid ${key} color` }
    }
  }

  // Validate font
  const fontCandidate = payload.typography?.fontId ?? payload.typography?.font ?? payload.fontId ?? payload.font
  if (fontCandidate && !ALLOWED_FONT_IDS.has(fontCandidate)) {
    return { valid: false, message: 'Invalid font selection' }
  }

  // Validate corners
  if (payload.corners) {
    if (payload.corners.radiusMultiplier !== undefined) {
      if (!isNumberInRange(payload.corners.radiusMultiplier, THEME_RADIUS_MULTIPLIER_MIN, THEME_RADIUS_MULTIPLIER_MAX)) {
        return { valid: false, message: `Radius multiplier must be between ${THEME_RADIUS_MULTIPLIER_MIN} and ${THEME_RADIUS_MULTIPLIER_MAX}` }
      }
    }
    if (payload.corners.enabled !== undefined && typeof payload.corners.enabled !== 'boolean') {
      return { valid: false, message: 'Corners enabled must be a boolean' }
    }
  }

  return { valid: true }
}

/**
 * Middleware to validate theme payload
 */
export function validateThemeMiddleware(c, next) {
  const payload = c.req.valid('json')
  if (!payload) {
    return c.json({ error: 'Invalid request body' }, 400)
  }

  const validation = validateThemePayload(payload)
  if (!validation.valid) {
    return c.json({ error: validation.message }, 400)
  }

  return next()
}

