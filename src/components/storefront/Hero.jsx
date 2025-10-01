import { useEffect, useState } from 'react'
import { normalizeImageUrl } from '../../lib/utils'
import { Button } from '../ui/button'

const defaultHeroSettings = {
  heroImageUrl: '',
  heroTitle: 'Welcome to OpenShop',
  heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.'
}

export function Hero({ initialSettings = null }) {
  const [settings, setSettings] = useState({
    ...defaultHeroSettings,
    ...(initialSettings || {})
  })

  useEffect(() => {
    let isMounted = true
    async function fetchSettings() {
      try {
        const res = await fetch('/api/store-settings')
        if (res.ok) {
          const data = await res.json()
          if (isMounted) setSettings(prev => ({
            ...prev,
            heroImageUrl: data.heroImageUrl || '',
            heroTitle: data.heroTitle || prev.heroTitle,
            heroSubtitle: data.heroSubtitle || prev.heroSubtitle
          }))
        }
      } catch (e) {
        console.error('Failed to load store settings', e)
      }
    }
    if (!initialSettings) {
      fetchSettings()
    }
    return () => { isMounted = false }
  }, [initialSettings])

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({
        ...prev,
        ...initialSettings
      }))
    }
  }, [initialSettings])

  return (
    <div className="relative text-white">
      {/* Background */}
      {settings.heroImageUrl ? (
        <img src={normalizeImageUrl(settings.heroImageUrl)} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-70" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600" />
      )}
      <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">{settings.heroTitle}</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">{settings.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-black hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white transition-all duration-300">
              Shop Now
            </Button>
            <Button size="lg" variant="outline" className="border-white text-black bg-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white hover:border-transparent transition-all duration-300">
              Learn More
            </Button>
          </div>
        </div>
      </div>
      {/* Decorative overlay retained */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-white opacity-5 rounded-full"></div>
        <div className="absolute bottom-10 left-1/4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
      </div>
    </div>
  )
}
