import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { normalizeImageUrl } from '../../lib/utils'
import { Button } from '../ui/button'

export function Hero() {
  const [settings, setSettings] = useState({
    heroImageUrl: '',
    heroTitle: 'Welcome to OpenShop',
    heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.'
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
    fetchSettings()
    return () => { isMounted = false }
  }, [])

  return (
    <section className="relative w-screen overflow-hidden text-white">
      {settings.heroImageUrl ? (
        <img
          src={normalizeImageUrl(settings.heroImageUrl)}
          alt="Hero"
          className="w-screen h-auto max-h-[90vh] object-contain block mx-auto"
        />
      ) : (
        <div className="w-screen min-h-[320px] sm:min-h-[420px] lg:min-h-[560px] bg-gradient-to-r from-slate-600 to-slate-700" />
      )}

      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold">{settings.heroTitle}</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">{settings.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-gradient-to-r hover:from-slate-600 hover:to-slate-700 hover:text-white transition-all duration-300">
              Shop Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-slate-900 bg-white hover:bg-gradient-to-r hover:from-slate-600 hover:to-slate-700 hover:text-white hover:border-transparent transition-all duration-300"
              asChild
            >
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white opacity-5 rounded-full" />
        <div className="absolute bottom-10 left-1/4 w-16 h-16 bg-white opacity-10 rounded-full" />
      </div>
    </section>
  )
}
