import { useState, useEffect, useMemo } from 'react'
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
import { Navbar } from '../../components/storefront/Navbar'
import { Hero } from '../../components/storefront/Hero'
import { ProductCard } from '../../components/storefront/ProductCard'
import { Carousel } from '../../components/storefront/Carousel'
import { Footer } from '../../components/storefront/Footer'
import { Paintbrush, Type, Layout, Image as ImageIcon, Info, MapPin, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const MOCK_PRODUCTS = [
  {
    id: 'mock-1',
    name: 'Premium Headphones',
    tagline: 'High-fidelity wireless audio',
    description: 'High-fidelity wireless headphones with noise cancellation.',
    price: 29900,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    stripePriceId: 'price_mock'
  },
  {
    id: 'mock-2',
    name: 'Ergonomic Chair',
    tagline: 'Comfort for your workspace',
    description: 'Designed for comfort and productivity during long work sessions.',
    price: 45000,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500&q=80',
    stripePriceId: 'price_mock'
  },
  {
    id: 'mock-3',
    name: 'Mechanical Keyboard',
    tagline: 'Tactile typing experience',
    description: 'Tactile switches and customizable RGB lighting.',
    price: 12000,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b91a91e?w=500&q=80',
    stripePriceId: 'price_mock'
  }
]

const MOCK_COLLECTIONS = [
  { id: 'featured', name: 'Featured' },
  { id: 'workspace', name: 'Workspace' },
  { id: 'audio', name: 'Audio' },
]

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

export function StoreSettingsEditor() {
  const [activeSection, setActiveSection] = useState('theme')
  const [previewPage, setPreviewPage] = useState('home')
  const [editorCollapsed, setEditorCollapsed] = useState(false)
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
    contactEmail: 'contact@example.com',
    businessName: '',
    businessAddressLine1: '',
    businessAddressLine2: '',
    businessCity: '',
    businessState: '',
    businessPostalCode: '',
    businessCountry: ''
  })
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
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const shouldNormalize = name === 'logoImageUrl' || name === 'heroImageUrl' || name === 'aboutHeroImageUrl'
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
      setDriveNotice('Google Drive link detected - converted for reliable preview and delivery.')
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

  const persistTheme = async () => {
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
    if (e) {
      e.preventDefault()
    }
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

  const menuItems = [
    { id: 'theme', label: 'Theme & Colors', icon: Paintbrush },
    { id: 'identity', label: 'Identity', icon: ImageIcon },
    { id: 'info', label: 'Store Info', icon: Info },
    { id: 'hero', label: 'Homepage Hero', icon: Layout },
    { id: 'about', label: 'About Page', icon: Type },
    { id: 'contact', label: 'Contact & Business', icon: MapPin },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">Store settings</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">Edit content on the left and compare with a storefront-accurate preview.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] p-1">
              <Button type="button" size="sm" variant={previewPage === 'home' ? 'default' : 'ghost'} onClick={() => setPreviewPage('home')} className="h-8 px-3 text-xs">
                Homepage
              </Button>
              <Button type="button" size="sm" variant={previewPage === 'about' ? 'default' : 'ghost'} onClick={() => setPreviewPage('about')} className="h-8 px-3 text-xs">
                About page
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditorCollapsed((prev) => !prev)}
              className="h-8 px-3 text-xs"
            >
              {editorCollapsed ? <PanelLeftOpen className="mr-1.5 h-3.5 w-3.5" /> : <PanelLeftClose className="mr-1.5 h-3.5 w-3.5" />}
              {editorCollapsed ? 'Show editor' : 'Collapse editor'}
            </Button>
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${editorCollapsed ? "" : "xl:grid-cols-[360px_minmax(0,1fr)]"}`}>
        {!editorCollapsed && (
        <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-secondary)] p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    activeSection === item.id
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/15 text-[var(--admin-accent-light)]'
                      : 'border-[var(--admin-border-primary)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-overlay-light)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-4">
            {activeSection === 'theme' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] uppercase tracking-wide">Theme</h3>
                  <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)} disabled={themeLoading} className="h-8 text-xs">
                    Reset
                  </Button>
                </div>

                {COLOR_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-[var(--admin-text-primary)]">{group.title}</h4>
                      <p className="text-xs text-[var(--admin-text-muted)]">{group.description}</p>
                    </div>
                    <div className="grid gap-3">
                      {group.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">{field.label}</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={themeState.colors[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              className="h-8 w-12 rounded border border-[var(--admin-border-primary)] cursor-pointer bg-transparent"
                            />
                            <Input
                              value={themeState.colors[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              maxLength={7}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-4 pt-4 border-t border-[var(--admin-border-primary)]">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Typography</label>
                    <Select value={themeState.typography.fontId} onChange={(event) => handleThemeFontChange(event.target.value)}>
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.id} value={font.id}>{font.label}</option>
                      ))}
                    </Select>
                    <p className="text-xs text-[var(--admin-text-muted)]">Active font: {selectedFontOption.label}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Rounded Corners</label>
                      <Switch id="roundedCorners" checked={themeState.corners.enabled} onCheckedChange={handleThemeCornerToggle} />
                    </div>
                    <div className={themeState.corners.enabled ? '' : 'opacity-50'}>
                      <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)] mb-1">Radius Multiplier ({computedRadiusPx}px)</label>
                      <Input
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={themeState.corners.radiusMultiplier}
                        onChange={(event) => handleThemeCornerMultiplierChange(event.target.value)}
                        disabled={!themeState.corners.enabled}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'identity' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] uppercase tracking-wide">Brand Identity</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Logo Type</label>
                  <Select name="logoType" value={settings.logoType} onChange={handleLogoTypeChange}>
                    <option value="text">Text Logo</option>
                    <option value="image">Image Logo</option>
                  </Select>
                </div>

                {settings.logoType === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Logo Text</label>
                    <Input name="logoText" value={settings.logoText} onChange={handleChange} placeholder="Enter your store name" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Logo Image URL</label>
                    <ImageUrlField
                      value={settings.logoImageUrl}
                      onChange={(val) => setSettings((prev) => ({ ...prev, logoImageUrl: val }))}
                      placeholder="https://example.com/logo.png"
                      onPreview={(src) => setModalImage(src)}
                      hideInput
                    />
                    {driveNotice && <p className="text-xs text-gray-700">{driveNotice}</p>}
                    <p className="text-xs text-[var(--admin-text-muted)]">Recommended size: 200x50px</p>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'info' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] uppercase tracking-wide">Store Info</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Store Name</label>
                  <Input name="storeName" value={settings.storeName} onChange={handleChange} placeholder="Your Store Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Store Description</label>
                  <Input name="storeDescription" value={settings.storeDescription} onChange={handleChange} placeholder="Brief description of your store" />
                </div>
              </div>
            )}

            {activeSection === 'hero' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] uppercase tracking-wide">Homepage Hero</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Hero Image URL</label>
                  <ImageUrlField
                    value={settings.heroImageUrl}
                    onChange={(val) => setSettings((prev) => ({ ...prev, heroImageUrl: val }))}
                    placeholder="https://example.com/hero.jpg"
                    onPreview={(src) => setModalImage(src)}
                    hideInput
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hero Title (H1)</label>
                  <Input name="heroTitle" value={settings.heroTitle} onChange={handleChange} placeholder="Welcome" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hero Subtitle (H2)</label>
                  <Input name="heroSubtitle" value={settings.heroSubtitle} onChange={handleChange} placeholder="Subtitle" />
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] uppercase tracking-wide">About Page</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Hero Image URL</label>
                  <ImageUrlField
                    value={settings.aboutHeroImageUrl}
                    onChange={(val) => setSettings((prev) => ({ ...prev, aboutHeroImageUrl: val }))}
                    placeholder="https://example.com/about-hero.jpg"
                    onPreview={(src) => setModalImage(src)}
                    hideInput
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hero Title</label>
                  <Input name="aboutHeroTitle" value={settings.aboutHeroTitle} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hero Subtitle</label>
                  <Input name="aboutHeroSubtitle" value={settings.aboutHeroSubtitle} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    name="aboutContent"
                    value={settings.aboutContent}
                    onChange={handleChange}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            {activeSection === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] uppercase tracking-wide">Contact & Business</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Email</label>
                  <Input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} placeholder="contact@yourstore.com" />
                </div>
                <div className="pt-4 border-t space-y-4">
                  <h4 className="text-sm font-medium text-[var(--admin-text-primary)]">Business Address</h4>
                  <Input name="businessName" value={settings.businessName || ''} onChange={handleChange} placeholder="Business Name" />
                  <Input name="businessAddressLine1" value={settings.businessAddressLine1 || ''} onChange={handleChange} placeholder="Address Line 1" />
                  <Input name="businessAddressLine2" value={settings.businessAddressLine2 || ''} onChange={handleChange} placeholder="Address Line 2" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="businessCity" value={settings.businessCity || ''} onChange={handleChange} placeholder="City" />
                    <Input name="businessState" value={settings.businessState || ''} onChange={handleChange} placeholder="State" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="businessPostalCode" value={settings.businessPostalCode || ''} onChange={handleChange} placeholder="Zip Code" />
                    <Input name="businessCountry" value={settings.businessCountry || ''} onChange={handleChange} placeholder="Country" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {(themeMessage || themeError) && (
            <div className={`rounded-md px-3 py-2 text-xs ${themeError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {themeError || themeMessage}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[var(--admin-border-primary)] pt-4">
            <span className="text-xs text-[var(--admin-text-muted)]">{themeDirty ? 'Unsaved changes' : themeHasOverrides ? 'Custom theme saved' : 'Using default theme'}</span>
            <Button onClick={handleSubmit} disabled={saving || themeSaving}>
              {saving || themeSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
        )}

        <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-3 shadow-sm">
          <div className="max-h-[calc(100vh-10rem)] overflow-auto rounded-lg border border-[var(--admin-border-primary)] bg-white">
            <div style={previewStyles} data-storefront-theme="true" className="storefront-surface min-h-[900px]">
              {previewPage === 'home' ? (
                <>
                  <Navbar previewSettings={settings} disableNavigation={true} />
                  <Hero previewSettings={settings} />
                  <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <h2 className="text-3xl font-bold storefront-heading mb-8 text-center">Featured Products</h2>
                    <Carousel products={MOCK_PRODUCTS} />
                  </section>
                  <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-wrap gap-4 justify-center">
                      <Button variant="default">All Products</Button>
                      {MOCK_COLLECTIONS.map((collection) => (
                        <Button key={collection.id} variant="outline">{collection.name}</Button>
                      ))}
                    </div>
                  </section>
                  <section className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 pb-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {[...MOCK_PRODUCTS, ...MOCK_PRODUCTS].map((product, index) => (
                        <ProductCard key={`${product.id}-${index}`} product={{ ...product, id: `${product.id}-${index}` }} disableNavigation={true} />
                      ))}
                    </div>
                  </section>
                  <Footer previewSettings={settings} />
                </>
              ) : (
                <>
                  <Navbar previewSettings={settings} disableNavigation={true} />
                  <section className="relative w-screen overflow-hidden text-white">
                    {settings.aboutHeroImageUrl ? (
                      <img src={normalizeImageUrl(settings.aboutHeroImageUrl)} alt="About Hero" className="w-screen h-auto max-h-[90vh] object-contain block mx-auto" />
                    ) : (
                      <div className="w-screen min-h-[320px] sm:min-h-[420px] lg:min-h-[560px] bg-gradient-to-r from-slate-600 to-slate-700" />
                    )}
                    <div className="absolute inset-0 bg-black/40" aria-hidden />
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 text-center">
                      <div className="max-w-4xl mx-auto space-y-6">
                        <h1 className="text-4xl md:text-6xl font-bold">{settings.aboutHeroTitle}</h1>
                        <p className="text-xl md:text-2xl max-w-3xl mx-auto">{settings.aboutHeroSubtitle}</p>
                      </div>
                    </div>
                  </section>
                  <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
                      <div className="prose prose-lg max-w-none">
                        {(settings.aboutContent || '').split('\n\n').map((paragraph, index) => (
                          <p key={index} className="mb-6 text-gray-700 leading-relaxed">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </section>
                  <Footer previewSettings={settings} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
          <AlertDialogAction onClick={() => setSavedOpen(false)}>OK</AlertDialogAction>
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
    </div>
  )
}
