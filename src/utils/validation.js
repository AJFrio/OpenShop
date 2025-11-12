// Reusable validation utilities

/**
 * Validates hex color format
 * @param {string} color - Color string to validate
 * @returns {boolean}
 */
export function isValidHexColor(color) {
  if (typeof color !== 'string') return false
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexColorRegex.test(color.trim())
}

/**
 * Validates that a value is a number within a range
 * @param {any} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean}
 */
export function isNumberInRange(value, min, max) {
  const num = Number(value)
  return Number.isFinite(num) && num >= min && num <= max
}

/**
 * Validates that a value is a non-empty string
 * @param {any} value - Value to validate
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validates that a value is a valid array
 * @param {any} value - Value to validate
 * @returns {boolean}
 */
export function isValidArray(value) {
  return Array.isArray(value)
}

/**
 * Validates that a value is a valid object
 * @param {any} value - Value to validate
 * @returns {boolean}
 */
export function isValidObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

