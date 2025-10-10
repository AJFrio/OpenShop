// Storefront theme configuration and utilities.
// The admin dashboard uses a separate adminTheme file to avoid scope creep.

const BASE_RADIUS_PX = 12
const THEME_KV_KEY = 'storefront:theme'
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/
const FONT_OPTIONS = [
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', 'system-ui', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: 'roboto',
    label: 'Roboto',
    stack: "'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    stack: "'Montserrat', 'Segoe UI', sans-serif",
  },
  {
    id: 'poppins',
    label: 'Poppins',
    stack: "'Poppins', 'Segoe UI', sans-serif",
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: "'Lora', 'Georgia', serif",
  },
]

const FONT_LOOKUP = FONT_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option
  return acc
}, {})

const DEFAULT_STORE_THEME = {
  colors: {
    primary: '#1e293b',
    secondary: '#475569',
    accent: '#3b82f6',
    text: '#0f172a',
  },
  typography: {
    fontId: 'inter',
  },
  corners: {
    enabled: true,
    radiusMultiplier: 1,
  },
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function hexToRgb(hex) {
  if (!hex) return null
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex
  const value = normalized.replace('#', '')
  const int = parseInt(value, 16)
  if (Number.isNaN(int)) return null
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

function rgbToHex({ r, g, b }) {
  const toHex = (channel) => channel.toString(16).padStart(2, '0')
  return `#${toHex(clamp(Math.round(channelSafe(r)), 0, 255))}${toHex(clamp(Math.round(channelSafe(g)), 0, 255))}${toHex(clamp(Math.round(channelSafe(b)), 0, 255))}`
}

function channelSafe(value) {
  return Number.isFinite(value) ? value : 0
}

function mixChannel(channel, target, factor) {
  return channel + (target - channel) * factor
}

function lighten(hex, factor = 0.1) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex({
    r: mixChannel(rgb.r, 255, factor),
    g: mixChannel(rgb.g, 255, factor),
    b: mixChannel(rgb.b, 255, factor),
  })
}

function darken(hex, factor = 0.1) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex({
    r: mixChannel(rgb.r, 0, factor),
    g: mixChannel(rgb.g, 0, factor),
    b: mixChannel(rgb.b, 0, factor),
  })
}

function getContrastColor(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.6 ? '#0f172a' : '#ffffff'
}

function ensureHex(color, fallback) {
  if (typeof color !== 'string') return fallback
  return HEX_COLOR_REGEX.test(color.trim()) ? color.trim() : fallback
}

function ensureFontId(fontId) {
  return FONT_LOOKUP[fontId] ? fontId : DEFAULT_STORE_THEME.typography.fontId
}

function ensureRadiusMultiplier(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      value = parsed
    }
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    value = DEFAULT_STORE_THEME.corners.radiusMultiplier
  }
  return clamp(Math.abs(value), 0, 4)
}

function sanitizeThemeInput(partialTheme = {}) {
  const colors = partialTheme.colors || {}
  const typography = partialTheme.typography || partialTheme.font
  const corners = partialTheme.corners || partialTheme.radius

  const sanitizedColors = {
    primary: ensureHex(colors.primary, DEFAULT_STORE_THEME.colors.primary),
    secondary: ensureHex(colors.secondary, DEFAULT_STORE_THEME.colors.secondary),
    accent: ensureHex(colors.accent, DEFAULT_STORE_THEME.colors.accent),
    text: ensureHex(colors.text, DEFAULT_STORE_THEME.colors.text),
  }

  const sanitizedTypography = {
    fontId: ensureFontId(typography?.fontId ?? typography?.font ?? typography?.id),
  }

  const sanitizedCorners = {
    enabled: corners?.enabled !== undefined ? Boolean(corners.enabled) : DEFAULT_STORE_THEME.corners.enabled,
    radiusMultiplier: ensureRadiusMultiplier(corners?.radiusMultiplier ?? corners?.multiplier ?? corners?.value),
  }

  return {
    colors: sanitizedColors,
    typography: sanitizedTypography,
    corners: sanitizedCorners,
  }
}

function deriveThemeDetails(theme) {
  const { colors, typography, corners } = theme
  const { fontId } = typography
  const fontOption = FONT_LOOKUP[fontId] || FONT_LOOKUP[DEFAULT_STORE_THEME.typography.fontId]
  const radiusBase = corners.enabled ? corners.radiusMultiplier * BASE_RADIUS_PX : 0

  const derivedColors = {
    onPrimary: getContrastColor(colors.primary),
    onSecondary: getContrastColor(colors.secondary),
    primaryHover: darken(colors.primary, 0.12),
    secondaryHover: darken(colors.secondary, 0.12),
    accentSoft: lighten(colors.accent, 0.4),
    background: lighten(colors.secondary, 0.85),
    surface: '#ffffff',
    mutedText: lighten(colors.text, 0.35),
  }

  return {
    colors: derivedColors,
    typography: {
      fontFamily: fontOption.stack,
      fontLabel: fontOption.label,
    },
    corners: {
      radiusPx: radiusBase,
      radiusSm: corners.enabled ? Math.max(radiusBase * 0.5, 2) : 0,
      radiusLg: corners.enabled ? radiusBase * 1.5 : 0,
    },
  }
}

function buildCssVariables(theme) {
  const base = sanitizeThemeInput(theme)
  const derived = deriveThemeDetails(base)

  return {
    '--storefront-color-primary': base.colors.primary,
    '--storefront-color-primary-hover': derived.colors.primaryHover,
    '--storefront-color-primary-contrast': derived.colors.onPrimary,
    '--storefront-color-secondary': base.colors.secondary,
    '--storefront-color-secondary-hover': derived.colors.secondaryHover,
    '--storefront-color-secondary-contrast': derived.colors.onSecondary,
    '--storefront-color-accent': base.colors.accent,
    '--storefront-color-accent-soft': derived.colors.accentSoft,
    '--storefront-color-text': base.colors.text,
    '--storefront-color-text-muted': derived.colors.mutedText,
    '--storefront-color-background': derived.colors.background,
    '--storefront-color-surface': derived.colors.surface,
    '--storefront-font-family': derived.typography.fontFamily,
    '--storefront-radius-base': `${derived.corners.radiusPx}px`,
    '--storefront-radius-sm': `${derived.corners.radiusSm}px`,
    '--storefront-radius-lg': `${derived.corners.radiusLg}px`,
  }
}

function resolveStorefrontTheme(partialTheme = {}) {
  const sanitized = sanitizeThemeInput(partialTheme.theme ?? partialTheme)
  const merged = {
    ...DEFAULT_STORE_THEME,
    ...sanitized,
    colors: {
      ...DEFAULT_STORE_THEME.colors,
      ...sanitized.colors,
    },
    typography: {
      ...DEFAULT_STORE_THEME.typography,
      ...sanitized.typography,
    },
    corners: {
      ...DEFAULT_STORE_THEME.corners,
      ...sanitized.corners,
    },
  }

  const { typography, corners } = deriveThemeDetails(merged)

  return {
    ...merged,
    typography: {
      ...merged.typography,
      fontFamily: typography.fontFamily,
      fontLabel: typography.fontLabel,
    },
    corners: {
      ...merged.corners,
      radiusPx: corners.radiusPx,
      radiusSm: corners.radiusSm,
      radiusLg: corners.radiusLg,
    },
    meta: {
      updatedAt: partialTheme.updatedAt ?? null,
    },
    cssVariables: buildCssVariables(merged),
  }
}

export {
  BASE_RADIUS_PX,
  DEFAULT_STORE_THEME,
  FONT_OPTIONS,
  HEX_COLOR_REGEX,
  THEME_KV_KEY,
  buildCssVariables,
  deriveThemeDetails,
  resolveStorefrontTheme,
  sanitizeThemeInput,
}
