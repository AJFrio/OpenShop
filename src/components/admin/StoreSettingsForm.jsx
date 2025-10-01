import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { adminApiRequest } from '../../lib/auth'
import { normalizeImageUrl } from '../../lib/utils'
import ImageUrlField from './ImageUrlField'
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction
} from '../ui/alert-dialog'

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

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/store-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
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
      setDriveNotice('Google Drive link detected — converted for reliable preview and delivery.')
      if (driveNoticeTimer) clearTimeout(driveNoticeTimer)
      const t = setTimeout(() => setDriveNotice(''), 3000)
      setDriveNoticeTimer(t)
    }
    return normalized
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Store Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Logo Configuration</h3>
            
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
              <div>
                <label className="block text-sm font-medium mb-2">Logo Image URL *</label>
                <ImageUrlField
                  value={settings.logoImageUrl}
                  onChange={(val) => setSettings(prev => ({ ...prev, logoImageUrl: val }))}
                  placeholder="https://example.com/logo.png"
                  onPreview={(src) => setModalImage(src)}
                  hideInput
                />
                {driveNotice && (
                  <p className="text-xs text-purple-700 mt-2">{driveNotice}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Recommended size: 200x50px or similar aspect ratio
                </p>
              </div>
            )}
          </div>

          {/* Store Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Store Information</h3>
            
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

          {/* Home Hero Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Home Hero</h3>
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

            {/* Hero Preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="relative">
                {settings.heroImageUrl ? (
                  <img src={normalizeImageUrl(settings.heroImageUrl)} alt="Hero" className="w-full h-48 object-cover opacity-80" />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-r from-purple-600 to-blue-600" />
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

          {/* Contact & Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact & Support</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Contact Email</label>
              <Input
                type="email"
                name="contactEmail"
                value={settings.contactEmail}
                onChange={handleChange}
                placeholder="contact@yourstore.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                This email will be used for the "Contact Us" button in the footer.
              </p>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center">
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
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-slate-900 text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    {modalImage && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <img src={modalImage} alt="preview" className="w-full h-auto object-contain rounded" />
          <div className="p-3 border-t text-center">
            <a href={modalImage} target="_blank" rel="noreferrer" className="text-sm text-purple-600 hover:text-purple-700">Open original</a>
          </div>
        </div>
      </div>
    )}
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
