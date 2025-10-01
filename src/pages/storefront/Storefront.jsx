import { useState, useEffect, useCallback, useRef } from 'react'
import { Navbar } from '../../components/storefront/Navbar'
import { Hero } from '../../components/storefront/Hero'
import { Carousel } from '../../components/storefront/Carousel'
import { ProductCard } from '../../components/storefront/ProductCard'
import { Footer } from '../../components/storefront/Footer'
import { HydrationOverlay } from '../../components/storefront/HydrationOverlay'
import { Button } from '../../components/ui/button'
import { getStorefrontCache, setStorefrontCache } from '../../lib/storefrontCache'

export function Storefront() {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [storeSettings, setStoreSettings] = useState({
    logoType: 'text',
    logoText: 'OpenShop',
    logoImageUrl: '',
    heroImageUrl: '',
    heroTitle: 'Welcome to OpenShop',
    heroSubtitle: 'Discover amazing products at unbeatable prices. Built on Cloudflare for lightning-fast performance.'
  })
  const [contactEmail, setContactEmail] = useState('contact@example.com')
  const [loading, setLoading] = useState(true)
  const isMountedRef = useRef(false)

  const applyStorefrontData = useCallback((data) => {
    if (!data) return

    if (Array.isArray(data.products)) {
      setProducts(data.products)
    }

    if (Array.isArray(data.collections)) {
      setCollections(data.collections)
    }

    if (data.storeSettings) {
      setStoreSettings(prev => ({
        ...prev,
        ...data.storeSettings
      }))
    }

    if (data.contactEmail) {
      setContactEmail(data.contactEmail)
    }
  }, [])

  const fetchData = useCallback(async ({ suppressLoading = false, fallback = null } = {}) => {
    if (!suppressLoading) {
      setLoading(true)
    }

    try {
      const [
        productsResponse,
        collectionsResponse,
        settingsResponse,
        contactResponse
      ] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/collections').catch(() => null),
        fetch('/api/store-settings').catch(() => null),
        fetch('/api/contact-email').catch(() => null)
      ])

      let productsData = null
      let collectionsData = null
      let settingsData = null
      let contactEmailData = null

      if (productsResponse?.ok) {
        productsData = await productsResponse.json()
      }

      if (collectionsResponse?.ok) {
        collectionsData = await collectionsResponse.json()
      }

      if (settingsResponse?.ok) {
        settingsData = await settingsResponse.json()
      }

      if (contactResponse?.ok) {
        const contactData = await contactResponse.json()
        contactEmailData = contactData.email || 'contact@example.com'
      }

      const nextData = {
        products: productsData ?? fallback?.products ?? [],
        collections: collectionsData ?? fallback?.collections ?? [],
        storeSettings: {
          ...(fallback?.storeSettings ?? {}),
          ...(settingsData ?? {})
        },
        contactEmail: contactEmailData ?? fallback?.contactEmail ?? 'contact@example.com'
      }

      if (isMountedRef.current) {
        applyStorefrontData(nextData)
      }

      setStorefrontCache(nextData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (!suppressLoading && isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [applyStorefrontData])

  useEffect(() => {
    isMountedRef.current = true

    const cached = getStorefrontCache()
    if (cached) {
      applyStorefrontData(cached)
      setLoading(false)
      fetchData({ suppressLoading: true, fallback: cached })
    } else {
      fetchData()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [applyStorefrontData, fetchData])

  const filteredProducts = selectedCollection
    ? products.filter(product => product.collectionId === selectedCollection)
    : products

  const featuredProducts = products.slice(0, 3) // Show first 3 products in carousel

  if (loading) {
    return <HydrationOverlay />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        initialCollections={collections}
        initialProducts={products}
        initialStoreSettings={storeSettings}
      />

      {/* Hero Section */}
      <Hero initialSettings={storeSettings} />

      {/* Featured Products Carousel */}
      {featuredProducts.length > 0 && (
        <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Featured Products
          </h2>
          <Carousel products={featuredProducts} />
        </section>
      )}

      {/* Collection Filter */}
      <section className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            variant={selectedCollection === null ? 'default' : 'outline'}
            onClick={() => setSelectedCollection(null)}
          >
            All Products
          </Button>
          {collections.map((collection) => (
            <Button
              key={collection.id}
              variant={selectedCollection === collection.id ? 'default' : 'outline'}
              onClick={() => setSelectedCollection(collection.id)}
            >
              {collection.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 pb-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              {selectedCollection 
                ? 'No products in this collection yet.' 
                : 'No products available at the moment.'
              }
            </p>
            {selectedCollection && (
              <Button onClick={() => setSelectedCollection(null)}>
                View All Products
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <Footer contactEmail={contactEmail} />
    </div>
  )
}
