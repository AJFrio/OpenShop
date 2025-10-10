import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { Switch } from '../ui/switch'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'
import ImageUrlField from './ImageUrlField'
import { DEFAULT_STORE_THEME, FONT_OPTIONS, resolveStorefrontTheme, BASE_RADIUS_PX } from '../../lib/theme'
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '../ui/alert-dialog'


const COLOR_GROUPS = [
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

function createThemeState(theme = DEFAULT_STORE_THEME) {
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

function extractThemeState(resolvedTheme) {
  return createThemeState({
    colors: resolvedTheme.colors || DEFAULT_STORE_THEME.colors,
    typography: {
      fontId: resolvedTheme.typography?.fontId || DEFAULT_STORE_THEME.typography.fontId,
    },
    corners: {
      enabled: resolvedTheme.corners?.enabled ?? DEFAULT_STORE_THEME.corners.enabled,
      radiusMultiplier: resolvedTheme.corners?.radiusMultiplier ?? DEFAULT_STORE_THEME.corners.radiusMultiplier,
    },
  })
}

function sanitizeHexInput(value) {
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

export function StoreSettingsForm() {
  const [settings, setSettings] = useState({
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: '',
    storeName: 'OpenShop',
    storeDescription: 'Your amazing online store',
    heroImageUrl: '',
    heroTitle: 'Welcome to OpenShop',
    heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.',
    aboutHeroImageUrl: '',
    aboutHeroTitle: 'About Us',
    aboutHeroSubtitle: 'Learn more about our story and mission',
    aboutContent: 'Welcome to our store! We are passionate about providing high-quality products and exceptional customer service. Our journey began with a simple idea: to make great products accessible to everyone.\n\nWe believe in quality, sustainability, and building lasting relationships with our customers. Every product in our catalog is carefully selected to meet our high standards.\n\nThank you for choosing us for your shopping needs!',
    contactEmail: 'contact@example.com'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalImage, setModalImage] = useState(null)
  const [savedOpen, setSavedOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [driveNotice, setDriveNotice] = useState('')
  const [driveNoticeTimer, setDriveNoticeTimer] = useState(null)

  const [themeState, setThemeState] = useState(createThemeState())
  const [themeLoading, setThemeLoading] = useState(true)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeDirty, setThemeDirty] = useState(false)
  const [themeHasOverrides, setThemeHasOverrides] = useState(false)
  const [themeMessage, setThemeMessage] = useState('')
  const [themeError, setThemeError] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const previewTheme = useMemo(() => resolveStorefrontTheme(themeState), [themeState])
  const previewStyles = useMemo(() => ({ ...previewTheme.cssVariables }), [previewTheme])
  const selectedFontOption = useMemo(
    () => FONT_OPTIONS.find((font) => font.id === themeState.typography.fontId) || FONT_OPTIONS[0],
    [themeState.typography.fontId]
  )

  const computedRadiusPx = Math.round(previewTheme.corners.radiusPx || 0)
  const themeResetDisabled = themeSaving || themeLoading || (!themeHasOverrides && !themeDirty)
  const headerDisabled = saving || themeSaving || themeLoading

  useEffect(() => {
    fetchSettings()
    fetchTheme()
  }, [])

  const fetchTheme = async () => {
    try {
      setThemeLoading(true)
      const response = await adminApiRequest('/api/admin/storefront/theme')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load storefront theme')
      }
      const data = await response.json()
      const resolved = resolveStorefrontTheme(data)
      const nextState = extractThemeState(resolved)
      setThemeState(nextState)
      setThemeHasOverrides(Boolean(resolved.meta?.updatedAt))
      setThemeDirty(false)
      setThemeMessage('')
      setThemeError('')
    } catch (error) {
      console.error('Error fetching storefront theme:', error)
      setThemeError(error.message || 'Failed to load storefront theme')
    } finally {
      setThemeLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/store-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({
          ...prev,
          ...data,
          // Ensure about page fields have defaults if missing
          aboutHeroImageUrl: data.aboutHeroImageUrl || '',
          aboutHeroTitle: data.aboutHeroTitle || prev.aboutHeroTitle,
          aboutHeroSubtitle: data.aboutHeroSubtitle || prev.aboutHeroSubtitle,
          aboutContent: data.aboutContent || prev.aboutContent || ''
        }))
      }
    } catch (error) {
      console.error('Error fetching store settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const shouldNormalize = name === 'logoImageUrl' || name === 'heroImageUrl'
    const normalized = shouldNormalize ? maybeNormalizeDriveUrl(value) : value
    setSettings(prev => ({
      ...prev,
      [name]: normalized
    }))
  }

  const handleLogoTypeChange = (e) => {
    const logoType = e.target.value
    setSettings(prev => ({
      ...prev,
      logoType
    }))
  }

  function maybeNormalizeDriveUrl(input) {
    const val = (input || '').trim()
    if (!val) return input
    const isDrive = val.includes('drive.google.com') || val.includes('drive.usercontent.google.com')
    if (!isDrive) return input
    const fileMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    const idMatch = val.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
    const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]) || null
    const normalized = id
      ? `https://drive.usercontent.google.com/download?id=${id}&export=view`
      : val
    if (normalized !== val) {
      setDriveNotice('Google Drive link detected Ã¢â‚¬â€ converted for reliable preview and delivery.')
      if (driveNoticeTimer) clearTimeout(driveNoticeTimer)
      const t = setTimeout(() => setDriveNotice(''), 3000)
      setDriveNoticeTimer(t)
    }
    return normalized
  }

  const markThemeDirty = () => {
    setThemeDirty(true)
    setThemeMessage('')
    setThemeError('')
  }

  const handleThemeColorChange = (key, value) => {
    const sanitized = sanitizeHexInput(value)
    setThemeState((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: sanitized,
      },
    }))
    markThemeDirty()
  }

  const handleThemeFontChange = (fontId) => {
    setThemeState((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        fontId,
      },
    }))
    markThemeDirty()
  }

  const handleThemeCornerToggle = (enabled) => {
    setThemeState((prev) => ({
      ...prev,
      corners: {
        ...prev.corners,
        enabled,
      },
    }))
    markThemeDirty()
  }

  const handleThemeCornerMultiplierChange = (value) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const clamped = Math.min(Math.max(numeric, 0), 4)
    setThemeState((prev) => ({
      ...prev,
      corners: {
        ...prev.corners,
        radiusMultiplier: clamped,
      },
    }))
    markThemeDirty()
  }

  const persistTheme = async ({ showSpinner = false } = {}) => {
    if (showSpinner) setThemeSaving(true)
    try {
      setThemeError('')
      setThemeMessage('')
      const response = await adminApiRequest('/api/admin/storefront/theme', {
        method: 'PUT',
        body: JSON.stringify(themeState),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update storefront theme')
      }
      const data = await response.json()
      const resolved = resolveStorefrontTheme(data)
      setThemeState(extractThemeState(resolved))
      setThemeHasOverrides(Boolean(resolved.meta?.updatedAt ?? Date.now()))
      setThemeDirty(false)
      setThemeMessage('Theme settings saved.')
      return resolved
    } catch (error) {
      console.error('Error updating storefront theme:', error)
      setThemeError(error.message || 'Failed to save theme')
      throw error
    } finally {
      if (showSpinner) setThemeSaving(false)
    }
  }

  const handleThemeReset = async () => {
    if (themeSaving) return false
    try {
      setThemeSaving(true)
      setThemeError('')
      setThemeMessage('')
      const response = await adminApiRequest('/api/admin/storefront/theme', { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to reset storefront theme')
      }
      const data = await response.json()
      const resolved = resolveStorefrontTheme(data)
      setThemeState(extractThemeState(resolved))
      setThemeHasOverrides(false)
      setThemeDirty(false)
      setThemeMessage('Theme reset to defaults.')
      return true
    } catch (error) {
      console.error('Error resetting storefront theme:', error)
      setThemeError(error.message || 'Failed to reset theme')
      return false
    } finally {
      setThemeSaving(false)
    }
  }

  const confirmThemeReset = async () => {
    const result = await handleThemeReset()
    if (result) {
      setResetConfirmOpen(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!themeLoading && themeDirty) {
        await persistTheme()
      }

      const response = await adminApiRequest('/api/admin/store-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        setSavedOpen(true)

        // Refresh navbar/logo by reloading after dialog closes
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error saving store settings:', error)
      setErrorText('Error saving settings: ' + (error?.message || 'Unknown error'))
      setErrorOpen(true)
    } finally {
      setSaving(false)
    }
  }

    if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <span className="ml-2">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="sticky top-20 z-20 px-6 py-4 bg-white/95 backdrop-blur border border-gray-200 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>
          <p className="text-sm text-gray-500">Manage storefront appearance, branding, and business details.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" form="store-settings-form" disabled={headerDisabled}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
      <Card className="w-full">
        <CardContent className="p-6">
          <form id="store-settings-form" onSubmit={handleSubmit} className="space-y-12">
          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Storefront Theme</h3>
                <p className="text-sm text-gray-600">
                  Adjust customer-facing colors, typography, and corner radius without redeploying the storefront.
                </p>
                {themeDirty && !themeLoading && (
                  <p className="text-sm text-amber-600">
                    Theme changes will be saved when you click "Save changes" above.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
                disabled={themeResetDisabled}
                className="w-full sm:w-auto"
              >
                {themeSaving ? 'Working...' : 'Reset to Default'}
              </Button>
            </div>

            {themeLoading && (
              <p className="text-sm text-gray-500">Loading current theme...</p>
            )}
            {themeError && (
              <p className="text-sm text-red-600">{themeError}</p>
            )}
            {themeMessage && !themeDirty && (
              <p className="text-sm text-green-600">{themeMessage}</p>
            )}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                {COLOR_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-900">{group.title}</h4>
                      <p className="text-xs text-gray-500">{group.description}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={themeState.colors[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              className="h-10 w-14 rounded border border-gray-200"
                            />
                            <Input
                              value={themeState.colors[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              maxLength={7}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Font Family</label>
                    <Select
                      value={themeState.typography.fontId}
                      onChange={(event) => handleThemeFontChange(event.target.value)}
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-sm text-gray-500" style={{ fontFamily: selectedFontOption?.stack }}>
                      Sample text using {selectedFontOption?.label}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rounded Corners</label>
                        <p className="text-xs text-gray-500">Disable for sharp edges across storefront components.</p>
                      </div>
                      <Switch
                        id="roundedCorners"
                        checked={themeState.corners.enabled}
                        onCheckedChange={handleThemeCornerToggle}
                      />
                    </div>
                    <div className={themeState.corners.enabled ? '' : 'opacity-50'}>
                      <label className="block text-sm font-medium text-gray-700">Radius Multiplier</label>
                      <Input
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={themeState.corners.radiusMultiplier}
                        onChange={(event) => handleThemeCornerMultiplierChange(event.target.value)}
                        disabled={!themeState.corners.enabled}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Base radius {BASE_RADIUS_PX}px × multiplier ≈ {computedRadiusPx}px corners.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                data-storefront-theme="true"
                style={previewStyles}
                className="border border-gray-200 rounded-xl overflow-hidden storefront-surface"
              >
                <div className="p-6 space-y-6">
                  <div className="storefront-hero storefront-radius-lg p-8 text-left space-y-4">
                    <span className="storefront-pill inline-flex text-xs uppercase tracking-wide">Hero Banner</span>
                    <h4 className="text-2xl font-semibold storefront-heading">Engaging Headline</h4>
                    <p className="storefront-subtle max-w-xl text-sm md:text-base">
                      Preview updates instantly as you fine-tune your storefront experience.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="px-4 py-2 storefront-button-primary storefront-radius-sm">
                        Primary CTA
                      </button>
                      <button type="button" className="px-4 py-2 storefront-button-outline storefront-radius-sm">
                        Secondary
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="storefront-card storefront-radius p-5 space-y-4">
                      <div className="h-28 w-full storefront-radius-sm" style={{ backgroundColor: 'var(--storefront-color-accent-soft)' }} />
                      <h5 className="text-lg font-semibold storefront-heading">Product Card</h5>
                      <p className="text-sm storefront-subtle">See how cards adapt to your chosen palette.</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold storefront-heading">$64.00</span>
                        <span className="storefront-pill text-xs uppercase">New</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="px-4 py-2 storefront-button-outline storefront-radius-sm">
                          Details
                        </button>
                        <button type="button" className="px-4 py-2 storefront-button-secondary storefront-radius-sm">
                          Wishlist
                        </button>
                        <button type="button" className="px-4 py-2 storefront-button-primary storefront-radius-sm">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                    <div className="storefront-surface-inverse storefront-radius p-5 space-y-4 border border-dashed border-gray-300">
                      <h6 className="text-sm font-semibold uppercase tracking-wide storefront-heading">
                        Typography & Corners
                      </h6>
                      <p className="text-base storefront-heading" style={{ fontFamily: selectedFontOption?.stack }}>
                        {selectedFontOption?.label} sample text
                      </p>
                      <p className="text-sm storefront-subtle">
                        Corner radius ≈ {computedRadiusPx}px (base {BASE_RADIUS_PX}px × {themeState.corners.radiusMultiplier}).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="px-3 py-2 storefront-button-primary storefront-radius-sm">
                          Primary
                        </button>
                        <button type="button" className="px-3 py-2 storefront-button-outline storefront-radius-sm">
                          Outline
                        </button>
                        <button type="button" className="px-3 py-2 storefront-button-secondary storefront-radius-sm">
                          Accent
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Brand Identity</h3>
              <p className="text-sm text-gray-600">Manage your logo preferences and establish your store voice.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Logo Type</label>
                <Select
                  name="logoType"
                  value={settings.logoType}
                  onChange={handleLogoTypeChange}
                >
                  <option value="text">Text Logo</option>
                  <option value="image">Image Logo</option>
                </Select>
              </div>

              {settings.logoType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Logo Text *</label>
                  <Input
                    name="logoText"
                    value={settings.logoText}
                    onChange={handleChange}
                    placeholder="Enter your store name"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Logo Image URL *</label>
                  <ImageUrlField
                    value={settings.logoImageUrl}
                    onChange={(val) => setSettings(prev => ({ ...prev, logoImageUrl: val }))}
                    placeholder="https://example.com/logo.png"
                    onPreview={(src) => setModalImage(src)}
                    hideInput
                  />
                  {driveNotice && (
                    <p className="text-xs text-gray-700">{driveNotice}</p>
                  )}
                  <p className="text-sm text-gray-500">Recommended size: 200x50px or similar aspect ratio</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Store Information</h3>
              <p className="text-sm text-gray-600">Update the name and short description used across the storefront.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Store Name</label>
                <Input
                  name="storeName"
                  value={settings.storeName}
                  onChange={handleChange}
                  placeholder="Your Store Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Store Description</label>
                <Input
                  name="storeDescription"
                  value={settings.storeDescription}
                  onChange={handleChange}
                  placeholder="Brief description of your store"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Homepage Hero</h3>
              <p className="text-sm text-gray-600">Craft the hero imagery and primary messaging visitors see first.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hero Image URL</label>
                <ImageUrlField
                  value={settings.heroImageUrl}
                  onChange={(val) => setSettings(prev => ({ ...prev, heroImageUrl: val }))}
                  placeholder="https://example.com/hero.jpg"
                  onPreview={(src) => setModalImage(src)}
                  hideInput
                />
                {driveNotice && (
                  <p className="text-xs text-purple-700 mt-2">{driveNotice}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Large, wide image recommended (e.g. 1600x600).</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Title (H1)</label>
                <Input
                  name="heroTitle"
                  value={settings.heroTitle}
                  onChange={handleChange}
                  placeholder="Welcome to OpenShop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Subtitle (H2)</label>
                <Input
                  name="heroSubtitle"
                  value={settings.heroSubtitle}
                  onChange={handleChange}
                  placeholder="Short supporting statement"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="relative">
                  {settings.heroImageUrl ? (
                    <img src={normalizeImageUrl(settings.heroImageUrl)} alt="Hero" className="w-full h-48 object-contain opacity-80" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-r from-gray-600 to-gray-700" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                    <div className="text-white">
                      <h1 className="text-2xl font-bold mb-2">{settings.heroTitle || 'Welcome to OpenShop'}</h1>
                      <p className="opacity-90">{settings.heroSubtitle || 'Discover amazing products at unbeatable prices.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">About Page</h3>
              <p className="text-sm text-gray-600">Tell your story with dedicated hero imagery and rich content.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">About Hero Image URL</label>
                <ImageUrlField
                  value={settings.aboutHeroImageUrl}
                  onChange={(val) => setSettings(prev => ({ ...prev, aboutHeroImageUrl: val }))}
                  placeholder="https://example.com/about-hero.jpg"
                  onPreview={(src) => setModalImage(src)}
                  hideInput
                />
                {driveNotice && (
                  <p className="text-xs text-purple-700 mt-2">{driveNotice}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Large, wide image recommended for the About page hero section.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">About Hero Title</label>
                <Input
                  name="aboutHeroTitle"
                  value={settings.aboutHeroTitle}
                  onChange={handleChange}
                  placeholder="About Us"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">About Hero Subtitle</label>
                <Input
                  name="aboutHeroSubtitle"
                  value={settings.aboutHeroSubtitle}
                  onChange={handleChange}
                  placeholder="Learn more about our story and mission"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">About Content</label>
                <textarea
                  name="aboutContent"
                  value={settings.aboutContent}
                  onChange={handleChange}
                  placeholder="Tell your story, mission, and values..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use double line breaks for new paragraphs. This content will be displayed on your About page.
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="relative">
                  {settings.aboutHeroImageUrl ? (
                    <img src={normalizeImageUrl(settings.aboutHeroImageUrl)} alt="About Hero" className="w-full h-48 object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-r from-gray-600 to-gray-700" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                    <div className="text-white">
                      <h1 className="text-2xl font-bold mb-2">{settings.aboutHeroTitle || 'About Us'}</h1>
                      <p className="opacity-90">{settings.aboutHeroSubtitle || 'Learn more about our story and mission'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <h4 className="font-medium text-gray-900 mb-2">Content Preview:</h4>
                  <div className="text-sm text-gray-600 max-h-20 overflow-hidden">
                    {(settings.aboutContent || '').split('\n\n').slice(0, 2).map((paragraph, index) => (
                      <p key={index} className="mb-2">
                        {paragraph.length > 100 ? `${paragraph.substring(0, 100)}...` : paragraph}
                      </p>
                    ))}
                    {(settings.aboutContent || '').split('\n\n').length > 2 && (
                      <p className="text-gray-400">...and more content</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact & Support</h3>
              <p className="text-sm text-gray-600">Specify the email address customers can use to reach you.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Contact Email</label>
                <Input
                  type="email"
                  name="contactEmail"
                  value={settings.contactEmail}
                  onChange={handleChange}
                  placeholder="contact@yourstore.com"
                />
                <p className="text-sm text-gray-500 mt-1">This email is shown in the storefront footer contact button.</p>
              </div>
            </div>
          </section>

          <section className="space-y-6 border-b border-gray-200 pb-12 last:border-0 last:pb-0">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Business Details</h3>
              <p className="text-sm text-gray-600">This address appears on invoices, shipping labels, and transactional emails.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <Input
                  name="businessName"
                  value={settings.businessName || ''}
                  onChange={handleChange}
                  placeholder="Your Business Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address Line 1</label>
                <Input
                  name="businessAddressLine1"
                  value={settings.businessAddressLine1 || ''}
                  onChange={handleChange}
                  placeholder="123 Business St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address Line 2</label>
                <Input
                  name="businessAddressLine2"
                  value={settings.businessAddressLine2 || ''}
                  onChange={handleChange}
                  placeholder="Suite 100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <Input
                    name="businessCity"
                    value={settings.businessCity || ''}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State/Province</label>
                  <Input
                    name="businessState"
                    value={settings.businessState || ''}
                    onChange={handleChange}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Postal Code</label>
                  <Input
                    name="businessPostalCode"
                    value={settings.businessPostalCode || ''}
                    onChange={handleChange}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <Input
                    name="businessCountry"
                    value={settings.businessCountry || ''}
                    onChange={handleChange}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Quick Preview</h3>
              <p className="text-sm text-gray-600">See how your logo renders in navigation surfaces.</p>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-4">
                {settings.logoType === 'text' ? (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {settings.logoText || 'OpenShop'}
                  </h1>
                ) : (
                  settings.logoImageUrl ? (
                    <img
                      src={settings.logoImageUrl}
                      alt="Store Logo"
                      className="h-12 max-w-48 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'block'
                      }}
                    />
                  ) : null
                )}
                {settings.logoType === 'image' && (
                  <div
                    className="h-12 w-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm"
                    style={{ display: settings.logoImageUrl ? 'none' : 'flex' }}
                  >
                    Logo Preview
                  </div>
                )}
              </div>
            </div>
          </section>
        </form>
      </CardContent>
    </Card>
    </div>
    {modalImage && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <img src={modalImage} alt="preview" className="w-full h-auto object-contain rounded" />
          <div className="p-3 border-t text-center">
            <a href={modalImage} target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-700">Open original</a>
          </div>
        </div>
      </div>
    )}
    <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset storefront theme?</AlertDialogTitle>
          <AlertDialogDescription>
            Resetting restores the bundled colors, fonts, and corner radius. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={themeSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmThemeReset} disabled={themeSaving}>
            {themeSaving ? 'Resetting...' : 'Reset Theme'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={savedOpen} onOpenChange={setSavedOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Settings saved</AlertDialogTitle>
          <AlertDialogDescription>
            Store settings updated successfully.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => window.location.reload()}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Something went wrong</AlertDialogTitle>
          <AlertDialogDescription>{errorText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
