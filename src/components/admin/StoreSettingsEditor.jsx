import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { Switch } from '../ui/switch'
import { adminApiRequest } from '../../lib/auth'
import ImageUrlField from './ImageUrlField'
import { FONT_OPTIONS, resolveStorefrontTheme, BASE_RADIUS_PX } from '../../lib/theme'
import {
  COLOR_GROUPS,
  createThemeState,
  extractThemeState,
  sanitizeHexInput,
} from './store-settings/themeFormState'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../ui/alert-dialog'
import { Image as ImageIcon, Info, MapPin, Paintbrush } from 'lucide-react'

const PuckPageEditor = lazy(() => import('./PuckPageEditor').then((module) => ({ default: module.PuckPageEditor })))

const DEFAULT_SETTINGS = {
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
  aboutContent: 'Welcome to our store! We are passionate about providing high-quality products and exceptional customer service.',
  contactEmail: 'contact@example.com',
  businessName: '',
  businessAddressLine1: '',
  businessAddressLine2: '',
  businessCity: '',
  businessState: '',
  businessPostalCode: '',
  businessCountry: '',
}

export function StoreSettingsEditor() {
  const [activeTab, setActiveTab] = useState('settings')
  const [activeSection, setActiveSection] = useState('theme')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [settingsBaseline, setSettingsBaseline] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalImage, setModalImage] = useState(null)
  const [savedOpen, setSavedOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorText, setErrorText] = useState('')

  const [themeState, setThemeState] = useState(createThemeState())
  const [themeLoading, setThemeLoading] = useState(true)
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeDirty, setThemeDirty] = useState(false)
  const [themeHasOverrides, setThemeHasOverrides] = useState(false)
  const [themeMessage, setThemeMessage] = useState('')
  const [themeError, setThemeError] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const previewTheme = useMemo(() => resolveStorefrontTheme(themeState), [themeState])
  const selectedFontOption = useMemo(
    () => FONT_OPTIONS.find((font) => font.id === themeState.typography.fontId) || FONT_OPTIONS[0],
    [themeState.typography.fontId]
  )
  const computedRadiusPx = Math.round(previewTheme.corners.radiusPx || 0)
  const settingsDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(settingsBaseline || settings),
    [settings, settingsBaseline]
  )

  useEffect(() => {
    fetchSettings()
    fetchTheme()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await adminApiRequest('/api/admin/store-settings')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load store settings')
      }
      const data = await response.json()
      const nextSettings = { ...DEFAULT_SETTINGS, ...data }
      setSettings(nextSettings)
      setSettingsBaseline(nextSettings)
    } catch (error) {
      console.error('Error fetching store settings:', error)
      setErrorText(error.message || 'Failed to load store settings')
      setErrorOpen(true)
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
      setThemeState(extractThemeState(resolved))
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

  const handleChange = (event) => {
    const { name, value } = event.target
    setSettings((prev) => ({ ...prev, [name]: value }))
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
    setThemeState((prev) => ({
      ...prev,
      corners: {
        ...prev.corners,
        radiusMultiplier: Math.min(Math.max(numeric, 0), 4),
      },
    }))
    markThemeDirty()
  }

  const persistTheme = async () => {
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
      setThemeError(error.message || 'Failed to reset theme')
      return false
    } finally {
      setThemeSaving(false)
    }
  }

  const confirmThemeReset = async () => {
    const result = await handleThemeReset()
    if (result) setResetConfirmOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setThemeError('')
    setThemeMessage('')

    try {
      if (!themeLoading && themeDirty) {
        await persistTheme()
      }

      if (settingsDirty) {
        const response = await adminApiRequest('/api/admin/store-settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update settings')
        }
        const updatedSettings = await response.json()
        setSettings({ ...DEFAULT_SETTINGS, ...updatedSettings })
        setSettingsBaseline({ ...DEFAULT_SETTINGS, ...updatedSettings })
      }

      setSavedOpen(true)
    } catch (error) {
      console.error('Error saving store settings:', error)
      setErrorText('Error saving settings: ' + (error?.message || 'Unknown error'))
      setErrorOpen(true)
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'theme', label: 'Theme & Colors', icon: Paintbrush },
    { id: 'identity', label: 'Identity', icon: ImageIcon },
    { id: 'info', label: 'Store Info', icon: Info },
    { id: 'contact', label: 'Contact & Business', icon: MapPin },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">Store settings</h2>
            <p className="text-xs text-[var(--admin-text-muted)]">Manage brand settings and edit storefront pages.</p>
          </div>
          <div className="inline-flex rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] p-1">
            <Button type="button" size="sm" variant={activeTab === 'settings' ? 'default' : 'ghost'} onClick={() => setActiveTab('settings')} className="h-8 px-3 text-xs">
              Brand & Theme
            </Button>
            <Button type="button" size="sm" variant={activeTab === 'pages' ? 'default' : 'ghost'} onClick={() => setActiveTab('pages')} className="h-8 px-3 text-xs">
              Pages
            </Button>
          </div>
        </div>
      </div>

      {activeTab === 'pages' ? (
        <Suspense fallback={<div className="rounded-lg border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-6 text-sm text-[var(--admin-text-muted)]">Loading page editor...</div>}>
          <PuckPageEditor />
        </Suspense>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-secondary)] p-4 shadow-sm">
            <div className="grid gap-2">
              {sections.map((item) => {
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
          </div>

          <div className="rounded-xl border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] p-5 shadow-sm">
            {activeSection === 'theme' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-primary)]">Theme</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)} disabled={themeLoading}>
                    Reset
                  </Button>
                </div>

                {COLOR_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--admin-text-primary)]">{group.title}</h4>
                      <p className="text-xs text-[var(--admin-text-muted)]">{group.description}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {group.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">{field.label}</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={themeState.colors[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              className="h-8 w-12 cursor-pointer rounded border border-[var(--admin-border-primary)] bg-transparent"
                            />
                            <Input value={themeState.colors[field.key]} onChange={(event) => handleThemeColorChange(field.key, event.target.value)} maxLength={7} className="h-8 text-xs" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="grid gap-4 border-t border-[var(--admin-border-primary)] pt-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Typography</label>
                    <Select value={themeState.typography.fontId} onChange={(event) => handleThemeFontChange(event.target.value)}>
                      {FONT_OPTIONS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
                    </Select>
                    <p className="text-xs text-[var(--admin-text-muted)]">Active font: {selectedFontOption.label}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Rounded corners</label>
                      <Switch id="roundedCorners" checked={themeState.corners.enabled} onCheckedChange={handleThemeCornerToggle} />
                    </div>
                    <div className={themeState.corners.enabled ? '' : 'opacity-50'}>
                      <label className="mb-1 block text-xs font-semibold uppercase text-[var(--admin-text-secondary)]">Radius Multiplier ({computedRadiusPx || BASE_RADIUS_PX}px)</label>
                      <Input type="number" min="0" max="4" step="0.1" value={themeState.corners.radiusMultiplier} onChange={(event) => handleThemeCornerMultiplierChange(event.target.value)} disabled={!themeState.corners.enabled} className="h-8" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'identity' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-primary)]">Brand Identity</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium">Logo Type</label>
                  <Select name="logoType" value={settings.logoType} onChange={handleChange}>
                    <option value="text">Text Logo</option>
                    <option value="image">Image Logo</option>
                  </Select>
                </div>
                {settings.logoType === 'text' ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Logo Text</label>
                    <Input name="logoText" value={settings.logoText} onChange={handleChange} />
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Logo Image</label>
                    <ImageUrlField value={settings.logoImageUrl} onChange={(value) => setSettings((prev) => ({ ...prev, logoImageUrl: value }))} onPreview={(src) => setModalImage(src)} hideInput />
                  </div>
                )}
              </div>
            )}

            {activeSection === 'info' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-primary)]">Store Info</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium">Store Name</label>
                  <Input name="storeName" value={settings.storeName} onChange={handleChange} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Store Description</label>
                  <Input name="storeDescription" value={settings.storeDescription} onChange={handleChange} />
                </div>
              </div>
            )}

            {activeSection === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-primary)]">Contact & Business</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium">Contact Email</label>
                  <Input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} />
                </div>
                <div className="grid gap-3 border-t border-[var(--admin-border-primary)] pt-4 md:grid-cols-2">
                  <Input name="businessName" value={settings.businessName || ''} onChange={handleChange} placeholder="Business Name" />
                  <Input name="businessAddressLine1" value={settings.businessAddressLine1 || ''} onChange={handleChange} placeholder="Address Line 1" />
                  <Input name="businessAddressLine2" value={settings.businessAddressLine2 || ''} onChange={handleChange} placeholder="Address Line 2" />
                  <Input name="businessCity" value={settings.businessCity || ''} onChange={handleChange} placeholder="City" />
                  <Input name="businessState" value={settings.businessState || ''} onChange={handleChange} placeholder="State" />
                  <Input name="businessPostalCode" value={settings.businessPostalCode || ''} onChange={handleChange} placeholder="Postal Code" />
                  <Input name="businessCountry" value={settings.businessCountry || ''} onChange={handleChange} placeholder="Country" />
                </div>
              </div>
            )}

            {(themeMessage || themeError) && (
              <div className={`mt-5 rounded-md px-3 py-2 text-xs ${themeError ? 'bg-[var(--admin-error-bg)] text-[var(--admin-error)]' : 'bg-[var(--admin-success-bg)] text-[var(--admin-success)]'}`}>
                {themeError || themeMessage}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-[var(--admin-border-primary)] pt-4">
              <span className="text-xs text-[var(--admin-text-muted)]">
                {settingsDirty || themeDirty ? 'Unsaved changes' : themeHasOverrides ? 'Custom theme saved' : 'Settings saved'}
              </span>
              <Button type="submit" disabled={saving || themeSaving || (!settingsDirty && !themeDirty)}>
                {saving || themeSaving ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {modalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setModalImage(null)}>
          <div className="mx-4 w-full max-w-3xl rounded-lg border border-[var(--admin-border-primary)] bg-[var(--admin-bg-card)] shadow-xl" onClick={(event) => event.stopPropagation()}>
            <img src={modalImage} alt="preview" className="h-auto w-full rounded object-contain" />
          </div>
        </div>
      )}

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset storefront theme?</AlertDialogTitle>
            <AlertDialogDescription>Resetting restores the bundled colors, fonts, and corner radius. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={themeSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmThemeReset} disabled={themeSaving}>{themeSaving ? 'Resetting...' : 'Reset Theme'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={savedOpen} onOpenChange={setSavedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Settings saved</AlertDialogTitle>
            <AlertDialogDescription>Store settings updated successfully.</AlertDialogDescription>
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
            <AlertDialogAction onClick={() => setErrorOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
