import { useState, useEffect } from 'react'
import { normalizeImageUrl } from '../../lib/utils'
import { useParams } from 'react-router-dom'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { ProductCard } from '../../components/storefront/ProductCard'

export function CollectionPage() {
  const { collectionId } = useParams()
  const [collection, setCollection] = useState(null)
  const [products, setProducts] = useState([])
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
            <a href="/" className="text-purple-600 hover:text-purple-500">
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
      <section className="relative">
        {collection.heroImage ? (
          <div className="relative h-96 bg-slate-900">
            <img
              src={collection.heroImage}
              alt={collection.name}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4">
                <h1 className="text-5xl font-bold mb-4">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-xl max-w-3xl mx-auto">
                    {collection.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-xl max-w-3xl mx-auto">
                    {collection.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
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
            <a href="/" className="text-purple-600 hover:text-purple-500">
              Browse all products
            </a>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Products ({products.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {products.map((product) => (
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
