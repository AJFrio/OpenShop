import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
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
import { Footer } from '../../components/storefront/Footer'
import { Paintbrush, Type, Layout, Image as ImageIcon, Info, MapPin, Mail } from 'lucide-react'

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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 border-r bg-white flex flex-col z-10 shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Store Editor</h2>
          <p className="text-xs text-gray-500">Real-time preview</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b bg-gray-50 no-scrollbar">
          {menuItems.map(item => {
             const Icon = item.icon
             return (
               <button
                 key={item.id}
                 onClick={() => setActiveSection(item.id)}
                 className={`flex-shrink-0 p-3 text-xs font-medium flex flex-col items-center gap-1 w-20 transition-colors border-b-2 ${
                   activeSection === item.id
                     ? 'border-purple-600 text-purple-700 bg-white'
                     : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                 }`}
               >
                 <Icon className="w-4 h-4" />
                 <span className="truncate max-w-full">{item.label}</span>
               </button>
             )
          })}
        </div>

        {/* Form Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeSection === 'theme' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Theme</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetConfirmOpen(true)}
                    disabled={themeLoading}
                    className="h-8 text-xs"
                  >
                    Reset
                  </Button>
              </div>

              {COLOR_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-gray-900">{group.title}</h4>
                      <p className="text-xs text-gray-500">{group.description}</p>
                    </div>
                    <div className="grid gap-3">
                      {group.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">{field.label}</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={themeState.colors[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              className="h-8 w-12 rounded border border-gray-200 cursor-pointer"
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

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Typography</label>
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
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">Rounded Corners</label>
                      <Switch
                        id="roundedCorners"
                        checked={themeState.corners.enabled}
                        onCheckedChange={handleThemeCornerToggle}
                      />
                    </div>
                    <div className={themeState.corners.enabled ? '' : 'opacity-50'}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Radius Multiplier ({computedRadiusPx}px)</label>
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
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Brand Identity</h3>
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
                  <label className="block text-sm font-medium mb-2">Logo Text</label>
                  <Input
                    name="logoText"
                    value={settings.logoText}
                    onChange={handleChange}
                    placeholder="Enter your store name"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Logo Image URL</label>
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
                  <p className="text-xs text-gray-500">Recommended size: 200x50px</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'info' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Store Info</h3>
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
          )}

          {activeSection === 'hero' && (
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Homepage Hero</h3>
               <div>
                <label className="block text-sm font-medium mb-2">Hero Image URL</label>
                <ImageUrlField
                  value={settings.heroImageUrl}
                  onChange={(val) => setSettings(prev => ({ ...prev, heroImageUrl: val }))}
                  placeholder="https://example.com/hero.jpg"
                  onPreview={(src) => setModalImage(src)}
                  hideInput
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Title (H1)</label>
                <Input
                  name="heroTitle"
                  value={settings.heroTitle}
                  onChange={handleChange}
                  placeholder="Welcome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Subtitle (H2)</label>
                <Input
                  name="heroSubtitle"
                  value={settings.heroSubtitle}
                  onChange={handleChange}
                  placeholder="Subtitle"
                />
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">About Page</h3>
               <div>
                <label className="block text-sm font-medium mb-2">Hero Image URL</label>
                <ImageUrlField
                  value={settings.aboutHeroImageUrl}
                  onChange={(val) => setSettings(prev => ({ ...prev, aboutHeroImageUrl: val }))}
                  placeholder="https://example.com/about-hero.jpg"
                  onPreview={(src) => setModalImage(src)}
                  hideInput
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Title</label>
                <Input
                  name="aboutHeroTitle"
                  value={settings.aboutHeroTitle}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Subtitle</label>
                <Input
                  name="aboutHeroSubtitle"
                  value={settings.aboutHeroSubtitle}
                  onChange={handleChange}
                />
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
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact & Business</h3>
               <div>
                <label className="block text-sm font-medium mb-2">Contact Email</label>
                <Input
                  type="email"
                  name="contactEmail"
                  value={settings.contactEmail}
                  onChange={handleChange}
                  placeholder="contact@yourstore.com"
                />
              </div>
              <div className="pt-4 border-t space-y-4">
                 <h4 className="text-sm font-medium text-gray-900">Business Address</h4>
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

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
           <span className="text-xs text-gray-500">{themeDirty ? 'Unsaved changes' : 'All saved'}</span>
           <Button onClick={handleSubmit} disabled={saving || themeSaving}>
             {saving || themeSaving ? 'Saving...' : 'Save Changes'}
           </Button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-gray-200 overflow-y-auto flex justify-center p-8">
         <div
           className="w-full max-w-7xl bg-white shadow-2xl min-h-screen storefront-surface flex flex-col scale-95 origin-top"
           style={previewStyles}
           data-storefront-theme="true"
         >
           {activeSection !== 'about' ? (
             <>
               <Navbar previewSettings={settings} disableNavigation={true} />
               <Hero previewSettings={settings} />
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
                  <h2 className="text-3xl font-bold storefront-heading mb-8 text-center">Featured Products</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_PRODUCTS.map(product => (
                      <ProductCard key={product.id} product={product} disableNavigation={true} />
                    ))}
                  </div>
               </div>
               <div className="flex-1" /> {/* Spacer */}
               <Footer previewSettings={settings} />
             </>
           ) : (
             <>
               <Navbar previewSettings={settings} disableNavigation={true} />
               <section className="relative w-full overflow-hidden storefront-hero">
                  {settings.aboutHeroImageUrl ? (
                    <img src={normalizeImageUrl(settings.aboutHeroImageUrl)} alt="About Hero" className="w-full h-64 object-cover" />
                  ) : (
                    <div className="w-full h-64 bg-slate-200" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                     <div className="text-center text-white px-4">
                        <h1 className="text-4xl font-bold mb-2">{settings.aboutHeroTitle}</h1>
                        <p className="text-xl opacity-90">{settings.aboutHeroSubtitle}</p>
                     </div>
                  </div>
               </section>
               <div className="max-w-4xl mx-auto px-4 py-16 text-lg space-y-6 storefront-heading w-full">
                  {settings.aboutContent.split('\n').map((paragraph, i) => (
                    paragraph.trim() && <p key={i}>{paragraph}</p>
                  ))}
               </div>
               <div className="flex-1" />
               <Footer previewSettings={settings} />
             </>
           )}
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
