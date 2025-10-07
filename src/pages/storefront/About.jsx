import { useEffect, useState } from 'react'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { normalizeImageUrl } from '../../lib/utils'

export function About() {
  const [settings, setSettings] = useState({
    aboutHeroImageUrl: '',
    aboutHeroTitle: 'About Us',
    aboutHeroSubtitle: 'Learn more about our story and mission',
    aboutContent: 'Welcome to our store! We are passionate about providing high-quality products and exceptional customer service. Our journey began with a simple idea: to make great products accessible to everyone.\n\nWe believe in quality, sustainability, and building lasting relationships with our customers. Every product in our catalog is carefully selected to meet our high standards.\n\nThank you for choosing us for your shopping needs!'
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
            aboutHeroImageUrl: data.aboutHeroImageUrl || prev.aboutHeroImageUrl || '',
            aboutHeroTitle: data.aboutHeroTitle || prev.aboutHeroTitle,
            aboutHeroSubtitle: data.aboutHeroSubtitle || prev.aboutHeroSubtitle,
            aboutContent: data.aboutContent || prev.aboutContent || ''
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <div className="relative text-white">
        {/* Background */}
        {settings.aboutHeroImageUrl ? (
          <img src={normalizeImageUrl(settings.aboutHeroImageUrl)} alt="About Hero" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700" />
        )}
        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{settings.aboutHeroTitle}</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">{settings.aboutHeroSubtitle}</p>
          </div>
        </div>
        {/* Decorative overlay retained */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-white opacity-5 rounded-full"></div>
          <div className="absolute bottom-10 left-1/4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
        </div>
      </div>

      {/* Content Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            {(settings.aboutContent || '').split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-6 text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default About
