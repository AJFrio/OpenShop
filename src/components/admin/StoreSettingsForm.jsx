import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select } from '../ui/select'

export function StoreSettingsForm() {
  const [settings, setSettings] = useState({
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: '',
    storeName: 'OpenShop',
    storeDescription: 'Your amazing online store'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

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
    setSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogoTypeChange = (e) => {
    const logoType = e.target.value
    setSettings(prev => ({
      ...prev,
      logoType
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/store-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        alert('Store settings updated successfully!')
        
        // Trigger a page refresh to update the navbar
        window.location.reload()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error saving store settings:', error)
      alert('Error saving settings: ' + error.message)
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
                <Input
                  name="logoImageUrl"
                  type="url"
                  value={settings.logoImageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  required
                />
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
  )
}
