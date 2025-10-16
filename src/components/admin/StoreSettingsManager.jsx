import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
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
import { Save, Palette, Image as ImageIcon, Type, Settings, Building, Mail, ChevronDown, ChevronUp } from 'lucide-react'

const EditableField = ({ label, value, onChange, placeholder, type = 'text' }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  )
}

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

const Section = ({ title, description, children, isOpen, onToggle }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={onToggle}>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

export function StoreSettingsManager() {
  const [settings, setSettings] = useState({
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: '',
    storeName: 'OpenShop',
    storeDescription: 'Your amazing online store',
    heroImageUrl: '',
    heroTitle: 'Welcome to OpenShop',
    heroSubtitle: 'Discover amazing products at unbeatable prices.',
    aboutHeroImageUrl: '',
    aboutHeroTitle: 'About Us',
    aboutHeroSubtitle: 'Learn more about our story and mission',
    aboutContent: '',
    contactEmail: 'contact@example.com',
    businessName: '',
    businessAddressLine1: '',
    businessAddressLine2: '',
    businessCity: '',
    businessState: '',
    businessPostalCode: '',
    businessCountry: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalImage, setModalImage] = useState(null)
  const [savedOpen, setSavedOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [openSections, setOpenSections] = useState({
    theme: true,
    brand: false,
    homepage: false,
    about: false,
    contact: false,
    business: false,
  })

  const [themeState, setThemeState] = useState(createThemeState())
  const [themeSaving, setThemeSaving] = useState(false)
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

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/store-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error fetching store settings:', error)
      setErrorText('Failed to load settings.')
      setErrorOpen(true)
    } finally {
      setLoading(false)
    }
  }

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
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

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Store Settings</h1>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-4">
          <Section title="Storefront Theme" description="Customize the look and feel of your storefront." isOpen={openSections.theme} onToggle={() => toggleSection('theme')}>
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
          </Section>
          <Section title="Brand Identity" description="Manage your logo and store name." isOpen={openSections.brand} onToggle={() => toggleSection('brand')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <EditableField label="Store Name" name="storeName" value={settings.storeName} onChange={handleChange} placeholder="Your Store Name" />
                <EditableField label="Store Description" name="storeDescription" value={settings.storeDescription} onChange={handleChange} placeholder="A brief description of your store" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Logo Type</label>
                  <Select name="logoType" value={settings.logoType} onChange={handleChange}>
                    <option value="text">Text Logo</option>
                    <option value="image">Image Logo</option>
                  </Select>
                </div>
                {settings.logoType === 'text' ? (
                  <EditableField label="Logo Text" name="logoText" value={settings.logoText} onChange={handleChange} placeholder="Enter your store name" />
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Logo Image</label>
                    <ImageUrlField
                      value={settings.logoImageUrl}
                      onChange={(val) => handleImageChange('logoImageUrl', val)}
                      placeholder="https://example.com/logo.png"
                      onPreview={(src) => setModalImage(src)}
                    />
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Homepage Hero" description="Customize the main section of your homepage." isOpen={openSections.homepage} onToggle={() => toggleSection('homepage')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <EditableField label="Hero Title" name="heroTitle" value={settings.heroTitle} onChange={handleChange} placeholder="Welcome to OpenShop" />
                <EditableField label="Hero Subtitle" name="heroSubtitle" value={settings.heroSubtitle} onChange={handleChange} placeholder="Short supporting statement" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Image</label>
                <ImageUrlField
                  value={settings.heroImageUrl}
                  onChange={(val) => handleImageChange('heroImageUrl', val)}
                  placeholder="https://example.com/hero.jpg"
                  onPreview={(src) => setModalImage(src)}
                />
              </div>
            </div>
          </Section>

          <Section title="About Page" description="Tell your story to your customers." isOpen={openSections.about} onToggle={() => toggleSection('about')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <EditableField label="About Page Title" name="aboutHeroTitle" value={settings.aboutHeroTitle} onChange={handleChange} placeholder="About Us" />
                <EditableField label="About Page Subtitle" name="aboutHeroSubtitle" value={settings.aboutHeroSubtitle} onChange={handleChange} placeholder="Learn more about our story" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Content</label>
                  <textarea
                    name="aboutContent"
                    value={settings.aboutContent}
                    onChange={handleChange}
                    placeholder="Tell your story..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">About Page Image</label>
                <ImageUrlField
                  value={settings.aboutHeroImageUrl}
                  onChange={(val) => handleImageChange('aboutHeroImageUrl', val)}
                  placeholder="https://example.com/about-hero.jpg"
                  onPreview={(src) => setModalImage(src)}
                />
              </div>
            </div>
          </Section>

          <Section title="Contact & Business Information" description="How customers can reach you and your business details." isOpen={openSections.business} onToggle={() => toggleSection('business')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact</h3>
                <EditableField label="Contact Email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} placeholder="contact@yourstore.com" type="email" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Business Address</h3>
                <EditableField label="Business Name" name="businessName" value={settings.businessName || ''} onChange={handleChange} placeholder="Your Company LLC" />
                <EditableField label="Address Line 1" name="businessAddressLine1" value={settings.businessAddressLine1 || ''} onChange={handleChange} placeholder="123 Main St" />
                <EditableField label="Address Line 2" name="businessAddressLine2" value={settings.businessAddressLine2 || ''} onChange={handleChange} placeholder="Suite 100" />
                <div className="grid grid-cols-2 gap-4">
                  <EditableField label="City" name="businessCity" value={settings.businessCity || ''} onChange={handleChange} placeholder="San Francisco" />
                  <EditableField label="State/Province" name="businessState" value={settings.businessState || ''} onChange={handleChange} placeholder="CA" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <EditableField label="Postal Code" name="businessPostalCode" value={settings.businessPostalCode || ''} onChange={handleChange} placeholder="94107" />
                  <EditableField label="Country" name="businessCountry" value={settings.businessCountry || ''} onChange={handleChange} placeholder="USA" />
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {modalImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <img src={normalizeImageUrl(modalImage)} alt="preview" className="w-full h-auto object-contain rounded" />
          </div>
        </div>
      )}
      <AlertDialog open={savedOpen} onOpenChange={setSavedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Settings Saved</AlertDialogTitle>
            <AlertDialogDescription>Your store settings have been updated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSavedOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    </>
  )
}