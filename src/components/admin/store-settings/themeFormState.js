import { DEFAULT_STORE_THEME } from '../../../lib/theme'

export const COLOR_GROUPS = [
  {
    title: 'Brand Colors',
    description: 'Primary palette for calls to action, highlights, and text accents.',
    fields: [
      { key: 'primary', label: 'Primary Color' },
      { key: 'secondary', label: 'Secondary Color' },
      { key: 'accent', label: 'Accent Color' },
      { key: 'text', label: 'Text Color' },
    ],
  },
  {
    title: 'Surface Colors',
    description: 'Backgrounds that shape the storefront canvas and product cards.',
    fields: [
      { key: 'background', label: 'Page Background' },
      { key: 'card', label: 'Product Card Background' },
    ],
  },
]

export function createThemeState(theme = DEFAULT_STORE_THEME) {
  return {
    colors: {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      accent: theme.colors.accent,
      text: theme.colors.text,
      background: (theme.colors && theme.colors.background) || DEFAULT_STORE_THEME.colors.background,
      card: (theme.colors && theme.colors.card) || DEFAULT_STORE_THEME.colors.card,
    },
    typography: {
      fontId: theme.typography.fontId,
    },
    corners: {
      enabled: theme.corners.enabled,
      radiusMultiplier: theme.corners.radiusMultiplier,
    },
  }
}

export function extractThemeState(resolvedTheme) {
  return createThemeState({
    colors: resolvedTheme.colors || DEFAULT_STORE_THEME.colors,
    typography: {
      fontId: resolvedTheme.typography?.fontId || DEFAULT_STORE_THEME.typography.fontId,
    },
    corners: {
      enabled: resolvedTheme.corners?.enabled ?? DEFAULT_STORE_THEME.corners.enabled,
      radiusMultiplier:
        resolvedTheme.corners?.radiusMultiplier ?? DEFAULT_STORE_THEME.corners.radiusMultiplier,
    },
  })
}

export function sanitizeHexInput(value) {
  if (!value) return '#'
  let next = String(value).trim().replace(/[^0-9a-fA-F#]/g, '')
  if (!next.startsWith('#')) {
    next = `#${next}`
  }
  if (next.length === 4) {
    const [, r, g, b] = next
    next = `#${r}${r}${g}${g}${b}${b}`
  }
  if (next.length > 7) {
    next = next.slice(0, 7)
  }
  return next.toUpperCase()
}
