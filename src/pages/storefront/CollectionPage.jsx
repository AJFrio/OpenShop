import { useState, useEffect, useMemo } from 'react'
import { normalizeImageUrl } from '../../lib/utils'
import { useParams, Link } from 'react-router-dom'
import { SmartImage } from '../../components/storefront/SmartImage'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { ProductCard } from '../../components/storefront/ProductCard'

export function CollectionPage() {
  const { collectionId } = useParams()
  const [collection, setCollection] = useState(null)
  const [products, setProducts] = useState([])
  const [sortBy, setSortBy] = useState('featured')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCollectionData()
  }, [collectionId])

  const fetchCollectionData = async () => {
    try {
      setLoading(true)
      
      // Fetch collection details and its products
      const [collectionResponse, productsResponse] = await Promise.all([
        fetch(`/api/collections/${collectionId}`),
        fetch(`/api/collections/${collectionId}/products`)
      ])

      if (collectionResponse.ok) {
        const collectionData = await collectionResponse.json()
        // Normalize hero image URLs (e.g., Google Drive links)
        const normalized = collectionData.heroImage ? normalizeImageUrl(collectionData.heroImage) : ''
        setCollection({ ...collectionData, heroImage: normalized })
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Error fetching collection data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedProducts = useMemo(() => {
    const list = [...products]
    if (sortBy === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sortBy === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sortBy === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return list
  }, [products, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading collection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Collection Not Found</h1>
            <p className="text-slate-600 mb-6">The collection you're looking for doesn't exist.</p>
            <a href="/" className="text-slate-600 hover:text-slate-500">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Collection Header */}
      <section className="relative w-full overflow-hidden text-white">
        <div className="min-h-[320px] sm:min-h-[420px] lg:min-h-[560px] bg-gradient-to-r from-slate-600 to-slate-700">
          {collection.heroImage && (
            <SmartImage
              src={collection.heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          )}
        </div>

        <div className="absolute inset-0 bg-black/40" aria-hidden />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold">{collection.name}</h1>
            {collection.description && (
              <p className="text-xl max-w-3xl mx-auto">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-6 pb-16">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No products in this collection</h3>
            <p className="text-slate-600 mb-6">
              This collection doesn't have any products yet.
            </p>
            <Link to="/" className="text-slate-600 hover:text-slate-500">
              Browse all products
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900">
                Products ({products.length})
              </h2>
              <div>
                <label htmlFor="collection-sort" className="sr-only">Sort products</label>
                <select
                  id="collection-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name A to Z</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
