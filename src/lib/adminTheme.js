import tokens from './admin-tokens.json'

/**
 * JS export of the admin design tokens.
 *
 * Canonical values live in `src/lib/admin-tokens.json`. CSS custom
 * properties in `src/styles/admin-tokens.css` (`--os-*`, with `--admin-*`
 * aliases) must stay in sync. OpenShop-Service should import the JSON.
 */
export const adminTokens = tokens

export const adminTheme = {
  colors: {
    background: tokens.color.bg.canvas,
    surface: tokens.color.bg.surface,
    surfaceHover: tokens.color.bg.surfaceHover,
    surfaceSecondary: tokens.color.bg.surfaceSecondary,
    border: tokens.color.border.default,
    borderSubdued: tokens.color.border.subdued,
    text: tokens.color.text.default,
    textMuted: tokens.color.text.secondary,
    textDisabled: tokens.color.text.disabled,
    primary: tokens.color.brand['600'],
    primaryHover: tokens.color.brand['700'],
    primaryLight: tokens.color.brand['400'],
    primaryDark: tokens.color.brand['900'],
    success: tokens.color.text.success,
    warning: tokens.color.text.caution,
    error: tokens.color.text.critical,
    info: tokens.color.text.info,
  },
  fontFamily: tokens.font.family,
  radius: tokens.radius,
  space: tokens.space,
  shadow: tokens.shadow,
}

export const adminColorScale = tokens.color.brand
